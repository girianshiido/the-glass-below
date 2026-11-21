import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CREATURE_FRAMES,ATLAS_SIZE} from '../src/creature-frames.ts';
import {creatureFrame,creatureLayout,VERTICAL_FOV,CAMERA_HEIGHT} from '../src/combat-view.ts';
import {effectFor} from '../src/effects.ts';
import {drawThinImpact} from '../src/impact-art.ts';

test('Each of the fifteen source rectangles is isolated from every neighbouring drawing',()=>{
 const all=Object.values(CREATURE_FRAMES).flat();assert.equal(all.length,15);
 for(let i=0;i<all.length;i++){
  const [l,t,r,b]=all[i];assert(l>=0&&t>=0&&r<=ATLAS_SIZE[0]&&b<=ATLAS_SIZE[1]);assert(r-l>150&&b-t>200);
  for(let j=i+1;j<all.length;j++){const[x,y,u,v]=all[j];assert(l>=u||x>=r||t>=v||y>=b,`Frames ${i} and ${j} must not overlap`);}
 }
 // Regression: the old equal-height middle row reached y=647, showing the Warden's axe.
 assert(CREATURE_FRAMES.wraith[0][3]<CREATURE_FRAMES.sentinel[0][1]);
 assert(CREATURE_FRAMES.wraith.every(rect=>rect[3]<=611));
});
test('Every pose stays above the enemy dock and below the toolbar, at full opponent size',()=>{
 const insets={top:68,bottom:92};
 for(const kind of ['scavenger','wraith','sentinel'])for(const[width,height]of [[320,220],[375,292],[375,409],[457,320],[1220,1322],[1280,607],[1920,875]])for(const depth of [2.35,2.6]){
  const layout=creatureLayout(kind,width,height,depth,insets),focal=height/(2*Math.tan(VERTICAL_FOV/2));
  const ground=height*.5+CAMERA_HEIGHT/depth*focal+layout.shiftY*height*.5;
  assert(Math.abs(ground-layout.bottom)<1e-8);
  for(let pose=0;pose<5;pose++){
   const f=creatureFrame(kind,pose),top=ground-f.height*layout.scale/depth*focal;
   const cx=width*.5,half=f.width*layout.scale/depth*focal*.5;
   assert(top>=insets.top-1e-7,`${kind} pose ${pose}: head hidden at ${width}x${height}`);
   assert(ground<=height-insets.bottom+1e-7,`${kind}: feet hidden by the dock`);
   assert(cx-half>=16-1e-7&&cx+half<=width-16+1e-7,`${kind}: side clipped`);
  }
  assert(layout.maxWidth*layout.scale<=2.28+1e-8,'Keep the opponent within the corridor walls');
 }
});
test('Physical impacts are short vector strokes, not the thick sprite illustrations',()=>{
 for(const kind of ['hit','hurt','break'])for(let id=0;id<4;id++){
  const spec=effectFor({kind,id,text:'',time:0});assert.equal(spec.art,'stroke');assert(spec.duration<=.45);
 }
 assert.equal(effectFor({kind:'ice',id:1,text:'',time:0}).art,'spell');
});
test('Blade art uses thin strokes and small sparks without a filled impact cloud',()=>{
 const widths=[],radii=[],curves=[];let lastRadius=0;const c={lineWidth:1,save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(...points){curves.push(points);},stroke(){widths.push(this.lineWidth);},arc(x,y,r){lastRadius=r;},fill(){radii.push(lastRadius);}};
 for(let variant=0;variant<4;variant++)drawThinImpact(c,variant,.25,160,'hit');
 assert(widths.length>20);assert(Math.max(...widths)<=2.6);assert(Math.max(...radii)<=2);assert(new Set(curves.map(v=>JSON.stringify(v))).size>=4);
});
