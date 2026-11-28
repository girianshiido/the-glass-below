import {EXPEDITION_FIXTURES,FLOATING_WALKWAY,BELL_BARRIER} from './expedition-world.ts';
import {isFloatingWalkway} from './expedition-state.ts';
import {BELL_STEPS,LOCK_STAIRS,SLUICE_WHEEL,TIDE_GATE} from './estuary-world.ts';
import {REGION_WORLDS,regionWall,VILLAGE_DETAILS,trailCoverage} from './region-world.ts';
import type {Zone} from './campaign.ts';
export type Vec=[number,number,number];
export const CELL=2.6;
export type Material='stone'|'floor'|'cobble'|'wood'|'plaster'|'roof'|'grass'|'path'|'leaf'|'metal'|'glass'|'water'|'mountain'|'shadow'|'coolglass'|'ember'|'fieldstone'|'brick'|'cutstone';
export const COLORS:Record<Material,Vec>={cutstone:[.87,.88,.8],fieldstone:[1,.97,.88],brick:[1.3,.78,.55],ember:[1,.55,.17],coolglass:[.2,.78,.81],shadow:[.03,.06,.05],cobble:[.86,.9,.84],stone:[.66,.72,.7],floor:[.73,.77,.72],wood:[.95,.9,.84],plaster:[1,1,1],roof:[.9,1,.98],grass:[.31,.48,.34],path:[1,1,1],leaf:[.18,.34,.28],metal:[.47,.35,.22],glass:[1,.94,.86],water:[.35,.63,.7],mountain:[.3,.42,.46]};
export function quad(out:number[],a:Vec,b:Vec,c:Vec,d:Vec,n:Vec,uv=[0,0,1,1]){const[u0,v0,u1,v1]=uv;for(const[p,u,v]of [[a,u0,v0],[b,u1,v0],[c,u1,v1],[a,u0,v0],[c,u1,v1],[d,u0,v1]]as [Vec,number,number][])out.push(...p,...n,u,v);}
export function box(out:number[],x:number,y:number,z:number,w:number,h:number,d:number){const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,t=y+h;quad(out,[a,y,c],[b,y,c],[b,t,c],[a,t,c],[0,0,-1],[0,0,w/2.6,h/2.6]);quad(out,[b,y,e],[a,y,e],[a,t,e],[b,t,e],[0,0,1],[0,0,w/2.6,h/2.6]);quad(out,[a,y,e],[a,y,c],[a,t,c],[a,t,e],[-1,0,0],[0,0,d/2.6,h/2.6]);quad(out,[b,y,c],[b,y,e],[b,t,e],[b,t,c],[1,0,0],[0,0,d/2.6,h/2.6]);quad(out,[a,t,c],[b,t,c],[b,t,e],[a,t,e],[0,1,0]);}
export function cone(out:number[],x:number,z:number,y:number,r:number,h:number,sides=10){for(let k=0;k<sides;k++){const a=k*Math.PI*2/sides,b=(k+1)*Math.PI*2/sides;quad(out,[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],[x,y+h,z],[x,y+h,z],[Math.cos((a+b)/2),r/h,Math.sin((a+b)/2)]);}}
export function cylinder(out:number[],x:number,z:number,y:number,r:number,h:number,sides=20){for(let k=0;k<sides;k++){const a=k*Math.PI*2/sides,b=(k+1)*Math.PI*2/sides,p:Vec=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],q:Vec=[x+Math.cos(b)*r,y,z+Math.sin(b)*r];quad(out,p,q,[q[0],y+h,q[2]],[p[0],y+h,p[2]],[Math.cos((a+b)/2),0,Math.sin((a+b)/2)],[k/sides,0,(k+1)/sides,h]);quad(out,[x,y+h,z],[p[0],y+h,p[2]],[q[0],y+h,q[2]],[x,y+h,z],[0,1,0]);}}
function ring(out:number[],x:number,z:number,y:number,r:number,inside:number,h:number){for(let k=0;k<24;k++){const a=k*Math.PI/12,b=(k+1)*Math.PI/12,p=(angle:number,radius:number,top:number):Vec=>[x+Math.cos(angle)*radius,top,z+Math.sin(angle)*radius];quad(out,p(a,r,y),p(b,r,y),p(b,r,y+h),p(a,r,y+h),[Math.cos(a),0,Math.sin(a)]);quad(out,p(b,inside,y),p(a,inside,y),p(a,inside,y+h),p(b,inside,y+h),[-Math.cos(a),0,-Math.sin(a)]);quad(out,p(a,inside,y+h),p(a,r,y+h),p(b,r,y+h),p(b,inside,y+h),[0,1,0]);}}
function fountain(stone:number[],water:number[]){const x=10*CELL,z=8*CELL;cylinder(stone,x,z,.01,1.22,.12);cylinder(stone,x,z,.13,1.12,.08);ring(stone,x,z,.2,1.06,.85,.34);ring(stone,x,z,.52,1.13,.82,.12);cylinder(water,x,z,.42,.84,.012,32);cylinder(stone,x,z,.2,.23,.86);cylinder(stone,x,z,.88,.35,.12);cone(stone,x,z,1.03,.61,-.2,24);ring(stone,x,z,1.02,.62,.53,.13);cylinder(water,x,z,1.1,.53,.01,28);cylinder(stone,x,z,1.1,.1,.3);for(let j=0;j<6;j++){const angle=j*Math.PI/3;for(let k=0;k<16;k++){const t=k/16,u=(k+1)/16;const point=(v:number):Vec=>[x+Math.cos(angle)*(.14+v*.64),1.37+.56*Math.sin(v*Math.PI)-v*.94,z+Math.sin(angle)*(.14+v*.64)],a=point(t),b=point(u);quad(water,[a[0]-.018,a[1],a[2]],[a[0]+.018,a[1],a[2]],[b[0]+.018,b[1],b[2]],[b[0]-.018,b[1],b[2]],[0,1,0]);quad(water,[a[0],a[1],a[2]-.018],[a[0],a[1],a[2]+.018],[b[0],b[1],b[2]+.018],[b[0],b[1],b[2]-.018],[1,0,0]);}}}
function hangingEmblem(wood:number[],metal:number[],x:number,z:number,shop:boolean){box(metal,x,2.65,z-.25,.08,.08,.7);for(const side of [-1,1])box(metal,x+side*.24,2.19,z,.035,.45,.035);const points=[[-.45,.3],[.36,.35],[.49,.1],[.38,-.32],[.06,-.41],[-.4,-.28],[-.5,.07]];for(let k=0;k<points.length;k++){const a=points[k],b=points[(k+1)%points.length];quad(wood,[x,1.97,z],[x+a[0],1.97+a[1],z],[x+b[0],1.97+b[1],z],[x,1.97,z],[0,0,1]);}if(shop){box(metal,x,1.73,z+.03,.055,.48,.04);box(metal,x,1.86,z+.04,.3,.05,.045);cone(metal,x,z+.04,2.21,.07,.1,4);}else{box(metal,x-.04,1.77,z+.03,.26,.31,.035);for(const dy of [0,.2])box(metal,x+.17,1.8+dy,z+.04,.15,.04,.04);box(metal,x+.23,1.8,z+.04,.04,.24,.04);}}
function pine(leaves:number[],trunk:number[],shadows:number[],x:number,z:number,h:number,seed:number){box(trunk,x,0,z,.3,h,.33);for(let layer=0;layer<6;layer++){const base=1.2+layer*h*.13,r=(h*.29)*(1-layer*.12),top=base+h*.44;for(let k=0;k<9;k++){const a=k*Math.PI*2/9,b=(k+1)*Math.PI*2/9,ra=r*(.88+.14*Math.sin(k*13+seed)),rb=r*(.88+.14*Math.sin((k+1)*13+seed));quad(leaves,[x+Math.cos(a)*ra,base+Math.sin(k*7+seed)*.2,z+Math.sin(a)*ra],[x+Math.cos(b)*rb,base+Math.sin((k+1)*7+seed)*.2,z+Math.sin(b)*rb],[x,top,z],[x,top,z],[Math.cos((a+b)/2),.48,Math.sin((a+b)/2)]);}}
 for(let k=0;k<12;k++){const a=k*Math.PI/6,b=(k+1)*Math.PI/6;quad(shadows,[x,.012,z],[x+Math.cos(a)*h*.3,.012,z+Math.sin(a)*h*.3],[x+Math.cos(b)*h*.3,.012,z+Math.sin(b)*h*.3],[x,.012,z],[0,1,0]);}}
export function forestTrees(){const trees:{x:number;z:number;height:number;radius:number;seed:number}[]=[],map=REGION_WORLDS.road.map,tiles=map.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='.'?[{x:x*CELL,z:y*CELL}]:[]));for(let y=-3;y<map.length+3;y++)for(let x=1;x<map[0].length+3;x++){if(!regionWall('road',x,y)||x>23&&Math.abs(y-6)<2)continue;const tx=x*CELL+Math.sin(x*73+y*19)*.65,tz=y*CELL+Math.sin(y*17+x)*.65,h=6.4+2*Math.sin(x*5+y*8),radius=h*.29*1.03;if(tiles.some(p=>Math.hypot(Math.max(0,Math.abs(tx-p.x)-CELL/2),Math.max(0,Math.abs(tz-p.z)-CELL/2))<radius+.45))continue;trees.push({x:tx,z:tz,height:h,radius,seed:x*31+y*7});}return trees;}
export function regionGeometry(zone:Zone){const w=REGION_WORLDS[zone],groups={}as Record<Material,number[]>;for(const k of Object.keys(COLORS)as Material[])groups[k]=[];const {stone,floor,cobble,wood,plaster,roof,grass,path,leaf,metal,glass,water,mountain,shadow,coolglass,ember,fieldstone,brick,cutstone}=groups;
 const width=w.map[0].length,height=w.map.length;
 if(zone==='village'){quad(grass,[-90,-.07,-90],[150,-.07,-90],[150,-.07,150],[-90,-.07,150],[0,1,0],[0,0,30,30]);for(let k=0;k<26;k++){const a=k*Math.PI*2/26,r=150+10*Math.sin(k*9);cone(mountain,20*CELL+Math.cos(a)*r,8*CELL+Math.sin(a)*r,-4,23+9*Math.sin(k*4),25+12*Math.sin(k*7),6);}}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(regionWall(zone,x,y)&&!(zone==='village'&&VILLAGE_DETAILS.some(([px,py])=>px===x&&py===y)))continue;const l=(x-.5)*CELL,r=(x+.5)*CELL,t=(y-.5)*CELL,b=(y+.5)*CELL;
  const ground=zone==='road'?path:zone==='village'?cobble:zone==='estuary'?(x>=21&&y>=9?wood:cobble):floor;if(zone!=='road'&&!(zone==='village'&&x===20&&y===8)&&!(zone==='estuary'&&isFloatingWalkway({x,y})))quad(ground,[l,0,t],[r,0,t],[r,0,b],[l,0,b],[0,1,0]);
  if(!w.outdoor){quad(stone,[l,w.ceiling,b],[r,w.ceiling,b],[r,w.ceiling,t],[l,w.ceiling,t],[0,-1,0]);for(const[dx,dy]of [[0,-1],[0,1],[-1,0],[1,0]]){
   if(!regionWall(zone,x+dx,y+dy))continue;
   // Glassworks machinery is freestanding; only the exterior boundary has walls.
   if(zone==='glassworks'&&x+dx>0&&y+dy>0&&x+dx<width-1&&y+dy<height-1)continue;
   if(dx===-1)quad(stone,[l,0,b],[l,0,t],[l,w.ceiling,t],[l,w.ceiling,b],[1,0,0],[0,0,1,w.ceiling/2.6]);if(dx===1)quad(stone,[r,0,t],[r,0,b],[r,w.ceiling,b],[r,w.ceiling,t],[-1,0,0],[0,0,1,w.ceiling/2.6]);if(dy===-1)quad(stone,[l,0,t],[r,0,t],[r,w.ceiling,t],[l,w.ceiling,t],[0,0,1],[0,0,1,w.ceiling/2.6]);if(dy===1)quad(stone,[r,0,b],[l,0,b],[l,w.ceiling,b],[r,w.ceiling,b],[0,0,-1],[0,0,1,w.ceiling/2.6]);
  }}
 }
 if(zone==='village'||zone==='estuary'){
  for(const b of w.buildings){const x=(b.x+(b.w-1)/2)*CELL,z=(b.y+(b.d-1)/2)*CELL,bw=b.w*CELL,bd=b.d*CELL;box(fieldstone,x,0,z,bw,.45,bd);box(plaster,x,.45,z,bw,b.h-.45,bd);
   // Pitched roofs with timber ridges and triangular gables.
   const a=x-bw/2-.4,c=x+bw/2+.4,n=z-bd/2-.4,s=z+bd/2+.4,h=b.h,top=h+b.roof;
   quad(roof,[a,h,n],[c,h,n],[c,top,z],[a,top,z],[0,.7,-.7],[0,0,b.w,2]);quad(roof,[c,h,s],[a,h,s],[a,top,z],[c,top,z],[0,.7,.7],[0,0,b.w,2]);quad(plaster,[a,h,s],[a,h,n],[a,top,z],[a,top,z],[-1,0,0]);quad(plaster,[c,h,n],[c,h,s],[c,top,z],[c,top,z],[1,0,0]);box(wood,x,top-.08,z,bw+.9,.18,.2);
   for(const side of [-1,1]){const edge=z+side*(bd/2+.035);box(wood,x,.55,edge,bw,.16,.13);box(wood,x,b.h-.2,edge,bw,.2,.13);for(let j=0;j<=b.w;j++)box(wood,x-bw/2+j*CELL,.4,edge,.17,b.h-.3,.15);for(let j=0;j<b.w;j++){if(j===Math.floor(b.w/2))continue;const wx=x-bw/2+(j+.5)*CELL;box(wood,wx,1.4,edge+side*.06,1.12,1.35,.1);box(glass,wx,1.5,edge+side*.13,.88,1.1,.04);box(wood,wx,1.5,edge+side*.17,.055,1.1,.05);box(wood,wx,2.02,edge+side*.17,.9,.06,.05);for(const slope of [-1,1])for(let k=-2;k<=2;k++){const line=k*.3,v1=(-.43-line)/slope,v2=(.43-line)/slope,a=Math.max(-.52,Math.min(v1,v2)),b=Math.min(.52,Math.max(v1,v2));if(b<=a)continue;const x1=wx+slope*a+line,x2=wx+slope*b+line;if(Math.abs(x1-wx)>.46||Math.abs(x2-wx)>.46)continue;const zz=edge+side*.18;quad(metal,[x1-.009,2.05+a,zz],[x1+.009,2.05+a,zz],[x2+.009,2.05+b,zz],[x2-.009,2.05+b,zz],[0,0,side]);}}
    box(wood,x,.03,edge+side*.08,1.35,2.35,.12);box(metal,x+.44,1,edge+side*.16,.09,.15,.05);box(fieldstone,x,0,edge+side*.4,1.8,.16,.8);
   }for(const side of [-1,1]){const edge=x+side*(bw/2+.045);box(wood,edge,.5,z,.16,.15,bd);box(wood,edge,b.h-.2,z,.16,.18,bd);for(let j=0;j<=b.d;j++)box(wood,edge,.45,z-bd/2+j*CELL,.16,b.h-.45,.18);for(const sz of [-1,1]){box(wood,edge+side*.035,1.35,z+sz*bd*.24,.08,1.4,1.15);box(glass,edge+side*.09,1.5,z+sz*bd*.24,.035,1.1,.88);box(wood,edge+side*.13,1.5,z+sz*bd*.24,.04,1.1,.055);}}
   const chx=x+bw*.33,chz=z-bd*.24,ch=b.roof+1;for(const side of [-1,1]){box(brick,chx+side*.3,b.h,chz,.18,ch,.8);box(brick,chx,b.h,chz+side*.3,.45,ch,.18);box(brick,chx+side*.35,b.h+ch-.08,chz,.24,.18,1);box(brick,chx,b.h+ch-.08,chz+side*.35,.5,.18,.24);}box(wood,chx,b.h+ch-.25,chz,.42,.02,.42);quad(shadow,[x-bw/2,.012,z+bd/2],[x+bw/2,.012,z+bd/2],[x+bw/2+2,.012,z+bd/2+3],[x-bw/2+2,.012,z+bd/2+3],[0,1,0]);
  }
 }
 if(zone==='village'){
  // Continuous enclosure with coping and buttresses. The gate is the only interruption.
  const maxX=(width-1)*CELL,maxZ=(height-1)*CELL,gz=8*CELL;
  for(const z of [0,maxZ]){box(fieldstone,maxX/2,0,z,maxX+.65,2.05,.62);box(fieldstone,maxX/2,2.05,z,maxX+.85,.18,.86);}
  box(fieldstone,0,0,maxZ/2,.62,2.05,maxZ);box(fieldstone,0,2.05,maxZ/2,.86,.18,maxZ);
  for(const[a,b]of [[0,gz-CELL/2],[gz+CELL/2,maxZ]]){box(fieldstone,maxX,0,(a+b)/2,.62,2.05,b-a);box(fieldstone,maxX,2.05,(a+b)/2,.86,.18,b-a);}
  for(const x of [0,maxX])for(const z of [0,maxZ])cylinder(fieldstone,x,z,0,.54,2.35,10);
  for(const side of [-1,1]){const z=gz+side*(CELL/2+.2);box(fieldstone,maxX,0,z,1,3.35,.7);box(fieldstone,maxX,3.35,z,1.12,.18,.86);}box(wood,maxX,3.25,gz,.45,.3,3.8);
  fountain(cutstone,water);
  for(const tx of [8,12]){const x=tx*CELL,z=8*CELL;ring(fieldstone,x,z,.02,.71,.56,.36);cylinder(grass,x,z,.06,.56,.12);for(let j=0;j<7;j++){const a=j*Math.PI*2/7,cx=x+Math.cos(a)*.31,cz=z+Math.sin(a)*.31;for(let k=0;k<10;k++){const u=k*Math.PI/5,v=(k+1)*Math.PI/5;quad(leaf,[cx+Math.cos(u)*.25,.25,cz+Math.sin(u)*.25],[cx+Math.cos(v)*.25,.25,cz+Math.sin(v)*.25],[cx+Math.cos(v)*.19,.68+j%3*.07,cz+Math.sin(v)*.19],[cx+Math.cos(u)*.19,.68+j%3*.07,cz+Math.sin(u)*.19],[Math.cos(u),.5,Math.sin(u)]);quad(leaf,[cx,.88,cz],[cx+Math.cos(u)*.19,.68+j%3*.07,cz+Math.sin(u)*.19],[cx+Math.cos(v)*.19,.68+j%3*.07,cz+Math.sin(v)*.19],[cx,.88,cz],[0,1,0]);}}}
  for(const tx of [7,13]){const x=tx*CELL,z=9*CELL;for(let j=0;j<3;j++)box(wood,x,.48,z+(j-1)*.18,1.9,.1,.15);box(wood,x,.85,z+.33,1.9,.35,.09);for(const side of [-1,1]){box(metal,x+side*.72,.02,z,.1,.5,.55);box(metal,x+side*.72,.48,z+.33,.08,.8,.08);}}

  for(const b of w.buildings){const cx=(b.x+(b.w-1)/2)*CELL,cz=(b.y+(b.d-1)/2)*CELL,bw=b.w*CELL,bd=b.d*CELL;
   if(b.kind!=='tower')for(const side of [-1,1]){const fz=cz+side*(bd*.5+.06);box(wood,cx,2.95,fz,bw,.2,.18);for(const edge of [-1,1]){const wx=cx+edge*CELL;box(wood,wx,3.25,fz+side*.04,1.18,1.15,.1);box(glass,wx,3.35,fz+side*.1,.92,.92,.045);box(wood,wx,3.22,fz+side*.12,1.35,.12,.34);}
    const fx=cx+side*(bw*.5+.06);box(wood,fx,2.95,cz,.18,.2,bd);for(const edge of [-1,1]){const wz=cz+edge*bd*.24;box(wood,fx+side*.04,3.25,wz,.1,1.15,1.18);box(glass,fx+side*.1,3.35,wz,.045,.92,.92);}}
   // Raised lintels, carved corbels, window sills and shutters cast real geometric shadows.
   const front=cz+bd/2+.08;for(const side of [-1,1]){box(fieldstone,cx+side*.78,0,front,.2,2.45,.32);box(fieldstone,cx+side*.78,2.2,front,.36,.2,.42);}box(fieldstone,cx,2.4,front,1.9,.23,.45);
   for(const side of [-1,1]){const wx=cx+side*CELL;box(wood,wx,1.34,front,1.4,.12,.45);for(const edge of [-1,1])box(wood,wx+edge*.65,1.4,front,.24,1.25,.16);}

   if(b.kind==='inn'||b.kind==='shop'){hangingEmblem(wood,metal,cx+1.85,front+.48,b.kind==='shop');box(metal,cx-1.1,2.45,front+.2,.06,.06,.5);box(ember,cx-1.1,1.99,front+.42,.21,.32,.21);for(const side of [-1,1]){box(metal,cx-1.1+side*.14,1.94,front+.42,.035,.44,.3);box(metal,cx-1.1,1.94,front+.42+side*.14,.3,.44,.035);}cone(metal,cx-1.1,front+.42,2.35,.24,.19,6);}
   cylinder(wood,cx-bw*.5+.4,cz+bd*.5+.26,0,.32,.67,12);for(const y of [.12,.53])ring(metal,cx-bw*.5+.4,cz+bd*.5+.26,y,.34,.3,.05);
  }
 }
 if(zone==='road'){
  quad(path,[-CELL/2,0,-CELL/2],[(width-.5)*CELL,0,-CELL/2],[(width-.5)*CELL,0,(height-.5)*CELL],[-CELL/2,0,(height-.5)*CELL],[0,1,0],[0,0,width,height]);
  for(const t of forestTrees())pine(leaf,wood,shadow,t.x,t.z,t.height,t.seed);
  for(let y=0;y<height;y+=.21)for(let x=0;x<width;x+=.23){const tx=x+.045*Math.sin(y*57+x*9),tz=y+.045*Math.sin(x*31),cover=trailCoverage(tx,tz);if(cover<.03||cover>.36)continue;const px=tx*CELL,pz=tz*CELL,h=.12+.14*(.5+.5*Math.sin(x*53+y*19));for(let k=0;k<3;k++){const a=k*Math.PI/3,s=Math.sin(a)*.035,c=Math.cos(a)*.035;quad(leaf,[px-s,.01,pz-c],[px+s,.01,pz+c],[px+.05*Math.sin(x),h,pz+.04*Math.cos(y)],[px+.05*Math.sin(x),h,pz+.04*Math.cos(y)],[Math.sin(a),.3,Math.cos(a)]);}}
  // The glassworks is visible at the end of the forest, well before the entrance.
  const ex=26*CELL,ez=6*CELL;box(stone,ex,0,ez,8,7.4,15);box(roof,ex,7.4,ez,8.8,.45,16);for(const z of [-5,5]){box(metal,ex+1,7.7,ez+z,1.5,8,1.5);for(let k=0;k<3;k++)box(metal,ex+1,9+k*2,ez+z,1.7,.16,1.7);}box(wood,24*CELL+.12,0,ez,.1,3.2,2.3);for(const z of [-4,4])box(glass,24.43*CELL,3.9,ez+z,.05,2.3,2.1);
 }
 if(zone==='glassworks'){
  for(const[x,y,bw,bd]of [[3,4,4,4],[16,4,4,4],[3,12,4,3],[17,12,3,3]]){const cx=(x+(bw-1)/2)*CELL,cz=(y+(bd-1)/2)*CELL;box(stone,cx,0,cz,bw*CELL,1.1,bd*CELL);box(stone,cx,1.1,cz,bw*CELL-.6,2.8,bd*CELL-.6);cone(stone,cx,cz,3.9,bw*CELL*.5,1.5,12);box(metal,cx,4.3,cz,1.1,2.2,1.1);for(const side of [-1,1]){box(wood,cx,.35,cz+side*bd*CELL/2,2.9,2.5,.2);box(ember,cx,.58,cz+side*(bd*CELL/2+.13),2.4,1.8,.04);for(let k=-2;k<=2;k++)box(metal,cx+k*.45,.5,cz+side*(bd*CELL/2+.19),.08,2.1,.05);}}
  for(const[x,y]of [[9,5],[13,5],[9,12],[13,12]]){box(stone,x*CELL,0,y*CELL,1.8,.4,1.8);box(metal,x*CELL,.4,y*CELL,.62,6.1,.62);box(metal,x*CELL,5.9,y*CELL,1.3,.5,1.3);}
  for(const x of [4,9,14,19]){box(metal,x*CELL,5.9,9*CELL,.22,.25,18*CELL);for(const z of [0,18]){box(wood,x*CELL,2.4,z*CELL+(z===0?.04:-.04),3,3.2,.08);box(coolglass,x*CELL,2.6,z*CELL+(z===0?.1:-.1),2.7,2.85,.04);box(metal,x*CELL,2.6,z*CELL+(z===0?.15:-.15),.13,2.85,.06);}}
 }
 if(zone==='crypts'){
  // Structural pillars frame the large chamber without partitioning it into corridors.
  for(const[x,y]of [[11,10],[15,10],[11,12],[15,12]]){box(stone,x*CELL-.9,0,y*CELL-.9,.48,w.ceiling,.48);box(metal,x*CELL-.9,3.8,y*CELL-.9,.7,.25,.7);}
 }
 if(zone==='estuary')estuaryArchitecture(groups);
 if(zone==='lockworks')lockworksArchitecture(groups);
 if(zone==='annealing')annealingArchitecture(groups);
 if(zone==='warehouse')warehouseArchitecture(groups);
 // Physical lintels and stair treads distinguish exits from blank walls.
 for(const p of w.passages){if(p.id==='pine-gate'||p.id==='village-return'||p.id==='bell-shortcut')continue;const x=p.id==='crypt-return'?.28*CELL:p.x*CELL,z=p.y*CELL,stair=p.id.includes('stairs')||p.id==='crypt-return',alongX=p.id==='crypt-return'||p.id==='warehouse-walkway'||p.id==='lock-culvert'||p.id==='warehouse-culvert'||p.x===0||p.x===width-1;
  for(const side of [-1,1])box(stone,x+(alongX?0:side*1.15),0,z+(alongX?side*1.15:0),alongX?.35:.25,3.15,alongX?.25:.35);box(stone,x,3.05,z,alongX?.35:2.6,.23,alongX?2.6:.35);
  if(stair){for(let k=0;k<7;k++)box(stone,x+(alongX?(k-3)*.29:0),.025+k*.075,z+(alongX?0:(k-3)*.29),alongX?.31:1.85,.08,alongX?1.85:.31);
   // Open handrails, with separated posts rather than opaque bronze slabs.
   for(const side of [-1,1]){for(const step of [-1,1])box(metal,x+(alongX?step*.82:side*1.02),.05,z+(alongX?side*1.02:step*.82),.045,.74,.045);box(metal,x+(alongX?0:side*1.02),.76,z+(alongX?side*1.02:0),alongX?1.8:.05,.045,alongX?.05:1.8);}}
 }

 return groups;
}

function estuaryArchitecture(groups:Record<Material,number[]>){
  const {water,fieldstone,wood,roof,mountain,metal,brick,ember,cutstone}=groups;
  // The stone causeway and quay stand above the open estuary.
  quad(water,[-120,-.61,-130],[155,-.61,-130],[155,-.61,155],[-120,-.61,155],[0,1,0],[0,0,42,42]);
  for(let i=0;i<22;i++){
    const angle=(i+1)*Math.PI/11;
    const ridge=108+12*Math.cos(i*2.1);
    const x=32+ridge*Math.cos(angle),z=22+ridge*Math.sin(angle);
    cone(mountain,x,z,-5,22+8*Math.sin(i*4),16+13*Math.cos(i*3)**2,7);
  }
  const terrain=REGION_WORLDS.estuary.map;
  for(let y=0;y<terrain.length;y++)for(let x=0;x<terrain[y].length;x++){
    if(terrain[y][x]!=='.'||isFloatingWalkway({x,y}))continue;
    if(x<=8||x>=21||y<=5){
      box(x>=21&&y>=9?wood:fieldstone,x*CELL,-1,y*CELL,CELL,.99,CELL);
      if((x<=8&&y===12||x===21&&y>=8||x===19&&y<=5)&&(x+y)%2!==0){
        const edge=x<=8?1.17:y<=5?-1.17:1.17;
        const px=x*CELL+(x>8?edge:0),pz=y*CELL+(x<=8?edge:0);
        cylinder(wood,px,pz,-.85,.135,1.65,9);
        cylinder(metal,px,pz,.58,.145,.08,9);
      }
    }
  }
  box(fieldstone,15.2*CELL,-.68,10*CELL,14*CELL,.62,9.9*CELL);
  for(const x of [8.5,10.5,12.5,14.5,16.5]){
    box(fieldstone,x*CELL,0,14.43*CELL,1.72,.43,.32);
    box(cutstone,x*CELL,.43,14.43*CELL,1.86,.1,.41);
  }
  for(const [x,z] of [[12.7,9],[17.9,10.8],[19.7,7.3],[21.4,11.3],[21.8,9.7]]){
    cylinder(wood,x*CELL,z*CELL,0,.32,.69,12);
    for(const ringY of [.11,.51])ring(metal,x*CELL,z*CELL,ringY,.34,.32,.08);
  }
  // The bonded warehouse is visible across the basin from the quay.
  const warehouseX=(FLOATING_WALKWAY.end+1.45)*CELL,warehouseZ=FLOATING_WALKWAY.y*CELL;
  box(fieldstone,warehouseX,-.95,warehouseZ,5.4,1,9.4);
  box(wood,warehouseX,0,warehouseZ,5.2,4.5,8.8);
  box(roof,warehouseX,4.48,warehouseZ,5.6,.3,9.3);
  box(cutstone,warehouseX-2.64,0,warehouseZ,1.2,2.64,2.3);
  box(wood,warehouseX-3.31,.14,warehouseZ,.14,2.2,1.74);
  for(const side of [-1,1]){
    box(metal,warehouseX-2.69,2.2,warehouseZ+side*2.7,.11,1.03,1.25);
    box(ember,warehouseX-2.75,2.33,warehouseZ+side*2.7,.1,.41,.48);
  }
  // Bell tower with a visible bronze bell recessed below its roof.
  const tx=BELL_STEPS.x*CELL,tz=(BELL_STEPS.y-1.19)*CELL;
  box(fieldstone,tx,0,tz,3.45,5.15,3.50);
  box(cutstone,tx,4.95,tz,3.82,.32,3.83);
  for(const dx of [-1.45,1.45])for(const dz of [-1.43,1.43])
    box(fieldstone,tx+dx,5.24,tz+dz,.43,2.2,.43);
  cylinder(metal,tx,tz,5.69,.49,.99,18);
  cylinder(brick,tx,tz,5.62,.65,.19,18);
  cylinder(metal,tx,tz,5.52,.12,.22,10);
  box(wood,tx,6.66,tz,2.98,.16,.25);
  box(cutstone,tx,7.36,tz,3.92,.25,3.92);
  cone(roof,tx,tz,7.58,2.8,1.93,4);
  for(const dx of [-.83,.83])box(cutstone,tx+dx,0,tz+1.82,.22,2.27,.29);
  box(cutstone,tx,2.16,tz+1.82,1.9,.27,.39);
  for(const [x,y] of [[SLUICE_WHEEL.x,SLUICE_WHEEL.y],[TIDE_GATE.x,TIDE_GATE.y]]){
    const z=y*CELL-.92;
    box(fieldstone,x*CELL,0,z,1.14,.83,.45);
    box(cutstone,x*CELL,.78,z,1.22,.13,.58);
  }
  // Heavy lock walls frame the steps, leaving the walkway clear.
  for(const side of [-1,1]){
    const x=(LOCK_STAIRS.x+side*.56)*CELL;
    box(fieldstone,x,0,(LOCK_STAIRS.y-.3)*CELL,.47,1.42,2.95);
    box(cutstone,x,1.41,(LOCK_STAIRS.y-.3)*CELL,.58,.15,3.11);
  }
  {
    const bx=24.1*CELL,bz=4.8*CELL;
    for(let i=-6;i<=6;i++){
      const width=1.01*(1-(i/7)**2);
      box(wood,bx,-.62,bz+i*.39,width,.55,.4);
      box(roof,bx,-.12,bz+i*.39,width*.88,.10,.4);
    }
    box(wood,bx,-.15,bz,.09,2.96,.09);
    box(wood,bx,1.92,bz,.08,.09,1.6);
    box(ember,bx,.52,bz+.85,.14,.21,.14);
  }
}

function lockworksArchitecture({metal,cutstone,wood,coolglass,water}:Record<Material,number[]>){
  for(const [x,z] of [[2,9],[8,6],[12,5],[12,3],[16,8],[22,8],[23,13],[25,15]]){
    for(const side of [-1,1]){
      box(cutstone,(x+side*.43)*CELL,0,z*CELL,.19,3.6,.29);
      box(metal,(x+side*.4)*CELL,1.25,z*CELL,.1,.24,.22);
      box(coolglass,(x+side*.38)*CELL,1.49,z*CELL,.15,.22,.15);
    }
    box(cutstone,x*CELL,3.27,z*CELL,CELL,.22,.35);
  }
  const gateX=BELL_BARRIER.x*CELL,gateZ=BELL_BARRIER.y*CELL+.95;
  for(const side of [-1,1])box(cutstone,gateX+side*1.15,0,gateZ,.34,3.31,.41);
  box(cutstone,gateX,3.13,gateZ,2.65,.25,.46);
  const relay=EXPEDITION_FIXTURES.signal;
  box(cutstone,relay.x*CELL,0,relay.y*CELL-.84,1.16,.9,.56);
  box(metal,relay.x*CELL,.9,relay.y*CELL-.84,.96,.4,.51);
  for(let i=-1;i<=1;i++)box(metal,relay.x*CELL+i*.23,1.22,relay.y*CELL-.68,.08,.22,.12);
  // Shallow brine along the walls gives the sump a visible waterline.
  for(const [x,y] of [[15,11],[18,13],[24,9],[24,11],[21,15],[25,16]]){
    const wx=x*CELL,wz=y*CELL;
    quad(water,[wx-1.1,.025,wz-1.15],[wx+1.1,.025,wz-1.15],[wx+1.1,.025,wz+1.15],[wx-1.1,.025,wz+1.15],[0,1,0]);
  }
  for(const z of [1.54,3.68]){
    box(wood,13.9*CELL,0,z*CELL,1.1,.54,.64);
    for(const dx of [-.43,.43])box(metal,13.9*CELL+dx,.04,z*CELL,.11,.54,.66);
  }
}


function archiveTable(groups:Record<Material,number[]>,x:number,z:number){
  const {wood,cutstone,metal}=groups;
  box(wood,x,.72,z,1.18,.12,.56);
  for(const side of [-1,1])box(wood,x+side*.49,0,z,.13,.74,.47);
  box(cutstone,x,.84,z,.53,.043,.36);
  for(const side of [-1,1])box(metal,x+side*.16,.88,z+.1,.028,.015,.16);
}

function annealingArchitecture(groups:Record<Material,number[]>){
  const {brick,metal,wood,cutstone,coolglass}=groups;
  for(const burner of [EXPEDITION_FIXTURES.westBurner,EXPEDITION_FIXTURES.eastBurner]){
    const x=burner.x*CELL,z=burner.y*CELL-.84;
    box(brick,x,0,z,1.52,1.22,.58);
    box(cutstone,x,1.2,z,1.64,.18,.71);
    box(metal,x,1.39,z,.28,3.31,.34);
    box(metal,x,.41,z+.31,1.12,.58,.08);
    for(const side of [-1,1])box(brick,x+side*.56,.23,z+.39,.23,.88,.47);
  }
  const ledger=EXPEDITION_FIXTURES.ledger;
  archiveTable(groups,ledger.x*CELL,ledger.y*CELL-.82);
  for(const [x,y] of [[3,12],[3,13],[7,11],[10,4],[12,4],[18,4],[15,12]]){
    const wx=x*CELL-.94,wz=y*CELL;
    box(wood,wx,0,wz,.55,1.38,1.18);
    for(const h of [.45,.94,1.36])box(coolglass,wx+.29,h,wz,.16,.28,.78);
  }
  for(let x=7;x<=16;x++){
    box(metal,x*CELL,3.55,5*CELL,CELL,.28,.32);
    box(brick,x*CELL,3.87,5*CELL,.26,.8,.3);
  }
}

function warehouseArchitecture(groups:Record<Material,number[]>){
  const {wood,metal,fieldstone}=groups;
  const freight=EXPEDITION_FIXTURES.freight;
  archiveTable(groups,freight.x*CELL,freight.y*CELL-.8);
  for(const [x,y] of [[2,10],[8,11],[4,14],[3,2],[7,4],[14,3],[17,5],[16,13],[12,11],[14,7]]){
    const wx=x*CELL-.87,wz=y*CELL;
    box(wood,wx,0,wz,.84,.84,1.16);
    box(wood,wx,.85,wz-.12,.71,.65,.65);
    for(const side of [-1,1])box(metal,wx+.43,.09,wz+side*.43,.06,.62,.11);
  }
  for(const [x,y] of [[3,3],[7,3],[3,11],[7,11],[14,3],[17,3],[12,12],[15,12]]){
    box(wood,x*CELL-.9,0,y*CELL+.88,.21,5.5,.21);
    box(fieldstone,x*CELL-.9,0,y*CELL+.88,.41,.42,.41);
    box(wood,x*CELL,4.87,y*CELL+.88,CELL,.18,.3);
  }
}
