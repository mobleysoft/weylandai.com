(function(G){'use strict';
const S=G.WeylandRoomSpec;if(!S)throw Error('Scene definition required');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function circleBox(x,z,r,b){const dx=x-clamp(x,b.c[0]-b.h[0],b.c[0]+b.h[0]),dz=z-clamp(z,b.c[2]-b.h[2],b.c[2]+b.h[2]);return dx*dx+dz*dz<r*r-1e-10;}
function distanceBox(x,z,b){return(x-clamp(x,b.c[0]-b.h[0],b.c[0]+b.h[0]))**2+(z-clamp(z,b.c[2]-b.h[2],b.c[2]+b.h[2]))**2;}
function create(){
 let elapsed=0;const doors=S.doors.map(d=>({...d,open:0,phase:'closed',lastNear:-Infinity,obstructed:false}));
 function leaves(d,open=d.open){const half=d.halfWidth/2;return[-1,1].map(side=>({id:d.id+'-'+side,c:[d.x+side*(half+d.halfWidth*open),d.height/2,d.z],h:[half-.008,d.height/2,d.depth],mat:61}));}
 function blocked(x,z,r=S.playerRadius){if(!Number.isFinite(x)||!Number.isFinite(z))return true;const b=S.bounds;if(x-r<b.minX||x+r>b.maxX||z-r<b.minZ||z+r>b.maxZ)return true;return S.solids.some(b=>b.c[1]-b.h[1]<S.playerHeight&&b.c[1]+b.h[1]>.02&&circleBox(x,z,r,b))||doors.some(d=>leaves(d).some(b=>circleBox(x,z,r,b)));}
 function move(position,delta){if(!Array.isArray(position)||!Array.isArray(delta)||!position.every(Number.isFinite)||!delta.every(Number.isFinite)||blocked(position[0],position[2]))return{position:position?.slice?.()||null,accepted:false,hit:true};let[x,,z]=position;const n=Math.max(1,Math.ceil(Math.hypot(delta[0],delta[2])/.06));if(n>20000)return{position:position.slice(),accepted:false,hit:true};let hitX=false,hitZ=false;for(let i=0;i<n;i++){const nx=x+delta[0]/n,nz=z+delta[2]/n;if(!blocked(nx,z))x=nx;else hitX=true;if(!blocked(x,nz))z=nz;else hitZ=true;}return{position:[x,S.eye,z],accepted:true,hit:hitX||hitZ,hitX,hitZ};}
 function admit(position){if(!Array.isArray(position)||position.length<3||!position.slice(0,3).every(Number.isFinite)||blocked(position[0],position[2]))return null;return[position[0],S.eye,position[2]];}
 function camera(from,to,r=.12){let result=from.slice(),delta=to.map((v,i)=>v-from[i]),steps=Math.max(1,Math.ceil(Math.hypot(...delta)/.04));const boxes=[...S.solids,...doors.flatMap(d=>leaves(d))];for(let j=1;j<=steps;j++){const q=from.map((v,i)=>v+delta[i]*j/steps);if(q[1]-r<S.floor||boxes.some(b=>q.reduce((sum,v,i)=>sum+(v-clamp(v,b.c[i]-b.h[i],b.c[i]+b.h[i]))**2,0)<r*r))break;result=q;}return result;}
 function tick(dt,actors){dt=clamp(Number.isFinite(dt)?dt:0,0,.1);elapsed+=dt;actors=(actors||[]).filter(p=>Array.isArray(p)&&p.length>=3&&p.every(Number.isFinite));for(const d of doors){const near=actors.some(p=>Math.hypot(p[0]-d.x,p[2]-d.z)<d.trigger);if(near)d.lastNear=elapsed;const released=actors.every(p=>Math.hypot(p[0]-d.x,p[2]-d.z)>d.release);const safety=actors.some(p=>Math.abs(p[0]-d.x)<d.halfWidth+S.playerRadius+.15&&Math.abs(p[2]-d.z)<.85+S.playerRadius);let wantOpen=near||safety||!released||elapsed-d.lastNear<d.holdSeconds;
   const next=clamp(d.open+(wantOpen?1:-1)*d.speed*dt,0,1);d.obstructed=false;
   // Check the full swept leaf volume against every actor before any movement.
   const current=leaves(d),future=leaves(d,next);for(let i=0;i<2;i++){const a=current[i],b=future[i],sweep={c:[(a.c[0]+b.c[0])/2,a.c[1],d.z],h:[a.h[0]+Math.abs(a.c[0]-b.c[0])/2,a.h[1],a.h[2]]};if(actors.some(p=>{const swept=distanceBox(p[0],p[2],sweep),before=distanceBox(p[0],p[2],a),after=distanceBox(p[0],p[2],b),clearance=(S.playerRadius+.08)**2;return swept<clearance&&(swept<S.playerRadius**2-1e-9||before>=clearance||after<before-1e-9)}))d.obstructed=true;}
   if(!d.obstructed)d.open=next;else if(next<d.open)d.lastNear=elapsed;
   d.phase=d.obstructed?'obstructed':d.open>=1?'open':d.open<=0?'closed':wantOpen?'opening':'closing';
 }return snapshot();}
 function snapshot(){return{units:'metres',eye:S.eye,radius:S.playerRadius,doors:doors.map(d=>({id:d.id,open:d.open,phase:d.phase,obstructed:d.obstructed,leaves:leaves(d)}))};}
 return Object.freeze({blocked,move,admit,camera,tick,snapshot,leaves,spec:S});
}
G.WeylandRoomPhysics=Object.freeze({create,circleBox,spec:S});
})(globalThis);
