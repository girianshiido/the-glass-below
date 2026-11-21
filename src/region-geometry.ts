import {REGION_WORLDS,regionWall} from './region-world.ts';
import type {Zone} from './campaign.ts';
export type Vec=[number,number,number];
export const CELL=2.6;
export type Material='stone'|'floor'|'cobble'|'wood'|'plaster'|'roof'|'grass'|'path'|'leaf'|'metal'|'glass'|'water'|'mountain'|'shadow';
export const COLORS:Record<Material,Vec>={shadow:[.03,.06,.05],cobble:[.86,.9,.84],stone:[.66,.72,.7],floor:[.73,.77,.72],wood:[.95,.9,.84],plaster:[1,1,1],roof:[.9,1,.98],grass:[.31,.48,.34],path:[1,1,1],leaf:[.18,.34,.28],metal:[.47,.35,.22],glass:[1,.64,.27],water:[.2,.78,.81],mountain:[.3,.42,.46]};
export function quad(out:number[],a:Vec,b:Vec,c:Vec,d:Vec,n:Vec,uv=[0,0,1,1]){const[u0,v0,u1,v1]=uv;for(const[p,u,v]of [[a,u0,v0],[b,u1,v0],[c,u1,v1],[a,u0,v0],[c,u1,v1],[d,u0,v1]]as [Vec,number,number][])out.push(...p,...n,u,v);}
export function box(out:number[],x:number,y:number,z:number,w:number,h:number,d:number){const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,t=y+h;quad(out,[a,y,c],[b,y,c],[b,t,c],[a,t,c],[0,0,-1]);quad(out,[b,y,e],[a,y,e],[a,t,e],[b,t,e],[0,0,1]);quad(out,[a,y,e],[a,y,c],[a,t,c],[a,t,e],[-1,0,0]);quad(out,[b,y,c],[b,y,e],[b,t,e],[b,t,c],[1,0,0]);quad(out,[a,t,c],[b,t,c],[b,t,e],[a,t,e],[0,1,0]);}
export function cone(out:number[],x:number,z:number,y:number,r:number,h:number,sides=10){for(let k=0;k<sides;k++){const a=k*Math.PI*2/sides,b=(k+1)*Math.PI*2/sides;quad(out,[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],[x,y+h,z],[x,y+h,z],[Math.cos((a+b)/2),r/h,Math.sin((a+b)/2)]);}}
function pine(leaves:number[],trunk:number[],shadows:number[],x:number,z:number,h:number,seed:number){box(trunk,x,0,z,.3,h,.33);for(let layer=0;layer<6;layer++){const base=1.2+layer*h*.13,r=(h*.29)*(1-layer*.12),top=base+h*.44;for(let k=0;k<9;k++){const a=k*Math.PI*2/9,b=(k+1)*Math.PI*2/9,ra=r*(.88+.14*Math.sin(k*13+seed)),rb=r*(.88+.14*Math.sin((k+1)*13+seed));quad(leaves,[x+Math.cos(a)*ra,base+Math.sin(k*7+seed)*.2,z+Math.sin(a)*ra],[x+Math.cos(b)*rb,base+Math.sin((k+1)*7+seed)*.2,z+Math.sin(b)*rb],[x,top,z],[x,top,z],[Math.cos((a+b)/2),.48,Math.sin((a+b)/2)]);}}
 for(let k=0;k<12;k++){const a=k*Math.PI/6,b=(k+1)*Math.PI/6;quad(shadows,[x,.012,z],[x+Math.cos(a)*h*.3,.012,z+Math.sin(a)*h*.3],[x+Math.cos(b)*h*.3,.012,z+Math.sin(b)*h*.3],[x,.012,z],[0,1,0]);}}
export function regionGeometry(zone:Zone){const w=REGION_WORLDS[zone],groups={}as Record<Material,number[]>;for(const k of Object.keys(COLORS)as Material[])groups[k]=[];const {stone,floor,cobble,wood,plaster,roof,grass,path,leaf,metal,glass,water,mountain,shadow}=groups;
 const width=w.map[0].length,height=w.map.length;
 if(w.outdoor){quad(grass,[-90,-.07,-90],[150,-.07,-90],[150,-.07,150],[-90,-.07,150],[0,1,0],[0,0,30,30]);for(let k=0;k<26;k++){const a=k*Math.PI*2/26,r=105+10*Math.sin(k*9);cone(mountain,width*CELL/2+Math.cos(a)*r,height*CELL/2+Math.sin(a)*r,-4,23+9*Math.sin(k*4),25+12*Math.sin(k*7),6);}}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(regionWall(zone,x,y))continue;const l=(x-.5)*CELL,r=(x+.5)*CELL,t=(y-.5)*CELL,b=(y+.5)*CELL;
  const ground=zone==='road'?path:zone==='village'?cobble:floor;quad(ground,[l,0,t],[r,0,t],[r,0,b],[l,0,b],[0,1,0]);
  if(!w.outdoor){quad(stone,[l,w.ceiling,b],[r,w.ceiling,b],[r,w.ceiling,t],[l,w.ceiling,t],[0,-1,0]);for(const[dx,dy]of [[0,-1],[0,1],[-1,0],[1,0]]){
   if(!regionWall(zone,x+dx,y+dy))continue;
   // Glassworks machinery is freestanding; only the exterior boundary has walls.
   if(zone==='glassworks'&&x+dx>0&&y+dy>0&&x+dx<width-1&&y+dy<height-1)continue;
   if(dx===-1)quad(stone,[l,0,b],[l,0,t],[l,w.ceiling,t],[l,w.ceiling,b],[1,0,0],[0,0,1,w.ceiling/2.6]);if(dx===1)quad(stone,[r,0,t],[r,0,b],[r,w.ceiling,b],[r,w.ceiling,t],[-1,0,0],[0,0,1,w.ceiling/2.6]);if(dy===-1)quad(stone,[l,0,t],[r,0,t],[r,w.ceiling,t],[l,w.ceiling,t],[0,0,1],[0,0,1,w.ceiling/2.6]);if(dy===1)quad(stone,[r,0,b],[l,0,b],[l,w.ceiling,b],[r,w.ceiling,b],[0,0,-1],[0,0,1,w.ceiling/2.6]);
  }}
 }
 if(zone==='village'){
  for(const b of w.buildings){const x=(b.x+(b.w-1)/2)*CELL,z=(b.y+(b.d-1)/2)*CELL,bw=b.w*CELL,bd=b.d*CELL;box(stone,x,0,z,bw,.45,bd);box(plaster,x,.45,z,bw,b.h-.45,bd);
   // Pitched roofs with timber ridges and triangular gables.
   const a=x-bw/2-.4,c=x+bw/2+.4,n=z-bd/2-.4,s=z+bd/2+.4,h=b.h,top=h+b.roof;
   quad(roof,[a,h,n],[c,h,n],[c,top,z],[a,top,z],[0,.7,-.7],[0,0,b.w,2]);quad(roof,[c,h,s],[a,h,s],[a,top,z],[c,top,z],[0,.7,.7],[0,0,b.w,2]);quad(plaster,[a,h,s],[a,h,n],[a,top,z],[a,top,z],[-1,0,0]);quad(plaster,[c,h,n],[c,h,s],[c,top,z],[c,top,z],[1,0,0]);box(wood,x,top-.08,z,bw+.9,.18,.2);
   for(const side of [-1,1]){const edge=z+side*(bd/2+.035);box(wood,x,.55,edge,bw,.16,.13);box(wood,x,b.h-.2,edge,bw,.2,.13);for(let j=0;j<=b.w;j++)box(wood,x-bw/2+j*CELL,.4,edge,.17,b.h-.3,.15);for(let j=0;j<b.w;j++){if(j===Math.floor(b.w/2))continue;const wx=x-bw/2+(j+.5)*CELL;box(wood,wx,1.4,edge+side*.06,1.12,1.35,.1);box(glass,wx,1.5,edge+side*.13,.88,1.1,.04);box(wood,wx,1.5,edge+side*.17,.055,1.1,.05);box(wood,wx,2.02,edge+side*.17,.9,.06,.05);}
    box(wood,x,.03,edge+side*.08,1.35,2.35,.12);box(metal,x+.44,1,edge+side*.16,.09,.15,.05);box(stone,x,0,edge+side*.4,1.8,.16,.8);
   }for(const side of [-1,1]){const edge=x+side*(bw/2+.045);box(wood,edge,.5,z,.16,.15,bd);box(wood,edge,b.h-.2,z,.16,.18,bd);for(let j=0;j<=b.d;j++)box(wood,edge,.45,z-bd/2+j*CELL,.16,b.h-.45,.18);for(const sz of [-1,1]){box(wood,edge+side*.035,1.35,z+sz*bd*.24,.08,1.4,1.15);box(glass,edge+side*.09,1.5,z+sz*bd*.24,.035,1.1,.88);box(wood,edge+side*.13,1.5,z+sz*bd*.24,.04,1.1,.055);}}
   box(stone,x+bw*.33,b.h,z-bd*.24,.8,b.roof+1,.8);quad(shadow,[x-bw/2,.012,z+bd/2],[x+bw/2,.012,z+bd/2],[x+bw/2+2,.012,z+bd/2+3],[x-bw/2+2,.012,z+bd/2+3],[0,1,0]);
  }
  // Visible forest beyond the village gate makes the next place legible before crossing it.
  quad(path,[24*CELL+.1,0,9*CELL],[39*CELL,0,9*CELL],[39*CELL,0,11*CELL],[24*CELL+.1,0,11*CELL],[0,1,0],[0,0,12,1]);for(let x=26;x<40;x+=2)for(const side of [-1,1])pine(leaf,wood,shadow,x*CELL,10*CELL+side*(4+Math.sin(x)*.4),6.5+Math.sin(x*4),x+side);
  // Village enclosure and gateposts leave an actual opening in the east wall.
  for(let x=0;x<width;x++){box(stone,x*CELL,0,0,CELL,2.1,.65);box(stone,x*CELL,0,(height-1)*CELL,CELL,2.1,.65);}for(let y=1;y<height-1;y++){box(stone,0,0,y*CELL,.65,2.1,CELL);if(y!==10)box(stone,24*CELL,0,y*CELL,.65,2.1,CELL);}
  for(const side of [-1,1]){box(stone,24*CELL,0,(10+side*.66)*CELL,1.1,3.7,.9);box(metal,24*CELL,3.5,(10+side*.66)*CELL,1.25,.2,1.1);}box(wood,24*CELL,3.4,10*CELL,.5,.35,4);
  // Fountain landmark: concentric raised stone basins, water and a central glass shard.
  const fx=12*CELL,fz=10*CELL;box(stone,fx,0,fz,2.1,.27,2.1);for(const side of [-1,1]){box(stone,fx+side*.94,.2,fz,.18,.5,2);box(stone,fx,.2,fz+side*.94,2,.5,.18);}box(water,fx,.38,fz,1.7,.03,1.7);box(stone,fx,.3,fz,.5,.9,.5);cone(water,fx,fz,1.1,.32,1.5,5);
 }
 if(zone==='road'){
  for(let y=-3;y<height+3;y++)for(let x=-3;x<width+3;x++){
   if(!regionWall(zone,x,y)||x===-1&&Math.abs(y-10)<2||x>23&&Math.abs(y-6)<2)continue;const jitter=Math.sin(x*73+y*19),tx=x*CELL+jitter*.65,tz=y*CELL+Math.sin(y*17+x)*.65,h=6.4+2*Math.sin(x*5+y*8);pine(leaf,wood,shadow,tx,tz,h,x*31+y*7);
  }
  // The glassworks is visible at the end of the forest, well before the entrance.
  const ex=26*CELL,ez=6*CELL;box(stone,ex,0,ez,8,7.4,15);box(roof,ex,7.4,ez,8.8,.45,16);for(const z of [-5,5]){box(metal,ex+1,7.7,ez+z,1.5,8,1.5);for(let k=0;k<3;k++)box(metal,ex+1,9+k*2,ez+z,1.7,.16,1.7);}box(wood,24*CELL+.12,0,ez,.1,3.2,2.3);for(const z of [-4,4])box(glass,24.43*CELL,3.9,ez+z,.05,2.3,2.1);
 }
 if(zone==='glassworks'){
  for(const[x,y,bw,bd]of [[3,4,4,4],[16,4,4,4],[3,12,4,3],[17,12,3,3]]){const cx=(x+(bw-1)/2)*CELL,cz=(y+(bd-1)/2)*CELL;box(stone,cx,0,cz,bw*CELL,1.1,bd*CELL);box(stone,cx,1.1,cz,bw*CELL-.6,2.8,bd*CELL-.6);cone(stone,cx,cz,3.9,bw*CELL*.5,1.5,12);box(metal,cx,4.3,cz,1.1,2.2,1.1);for(const side of [-1,1]){box(wood,cx,.35,cz+side*bd*CELL/2,2.9,2.5,.2);box(glass,cx,.58,cz+side*(bd*CELL/2+.13),2.4,1.8,.04);for(let k=-2;k<=2;k++)box(metal,cx+k*.45,.5,cz+side*(bd*CELL/2+.19),.08,2.1,.05);}}
  for(const[x,y]of [[9,5],[13,5],[9,12],[13,12]]){box(stone,x*CELL,0,y*CELL,1.8,.4,1.8);box(metal,x*CELL,.4,y*CELL,.62,6.1,.62);box(metal,x*CELL,5.9,y*CELL,1.3,.5,1.3);}
  for(const x of [4,9,14,19]){box(metal,x*CELL,5.9,9*CELL,.22,.25,18*CELL);for(const z of [0,18]){box(wood,x*CELL,2.4,z*CELL+(z===0?.04:-.04),3,3.2,.08);box(water,x*CELL,2.6,z*CELL+(z===0?.1:-.1),2.7,2.85,.04);box(metal,x*CELL,2.6,z*CELL+(z===0?.15:-.15),.13,2.85,.06);}}
 }
 if(zone==='crypts'){
  // Structural pillars frame the large chamber without partitioning it into corridors.
  for(const[x,y]of [[11,10],[15,10],[11,12],[15,12]]){box(stone,x*CELL-.9,0,y*CELL-.9,.48,w.ceiling,.48);box(metal,x*CELL-.9,3.8,y*CELL-.9,.7,.25,.7);}
 }
 // Physical lintels and stair treads distinguish exits from blank walls.
 for(const p of w.passages){const x=p.x*CELL,z=p.y*CELL,stair=p.id.includes('stairs')||p.id==='crypt-return',alongX=p.x===0||p.x===width-1;
  for(const side of [-1,1])box(stone,x+(alongX?0:side*1.15),0,z+(alongX?side*1.15:0),alongX?.45:.3,3.15,alongX?.3:.45);box(stone,x,3.05,z,alongX?.5:2.6,.3,alongX?2.6:.5);
  if(stair){for(let k=0;k<7;k++)box(stone,x,.025+k*.075,z+(k-3)*.29,1.85,.08,.31);for(const side of [-1,1])box(metal,x+side*1.02,.35,z,.08,.8,2.3);}
 }
 return groups;
}
