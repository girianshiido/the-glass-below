import type {CreatureKind} from './world.ts';
import {ATLAS_SIZE,CREATURE_FRAMES} from './creature-frames.ts';
export const VERTICAL_FOV=67*Math.PI/180;
export const CAMERA_HEIGHT=1.22;
export interface CombatInsets {top:number;bottom:number}
export interface CreatureLayout {scale:number;offsets:number[];shiftY:number;bottom:number;top:number;maxHeight:number;maxWidth:number}
export const DEFAULT_INSETS:CombatInsets={top:72,bottom:100};
const HEIGHTS:Record<CreatureKind,number>={scavenger:1.55,wraith:2.05,sentinel:2.45};
export function creatureFrame(kind:CreatureKind,pose:number){
  const rect=CREATURE_FRAMES[kind][Math.max(0,Math.min(4,pose))],reference=CREATURE_FRAMES[kind][0];
  const unit=HEIGHTS[kind]/(reference[3]-reference[1]);
  const [left,top,right,bottom]=rect;
  return{width:(right-left)*unit,height:(bottom-top)*unit,uv:[(left+.5)/ATLAS_SIZE[0],1-(bottom-.5)/ATLAS_SIZE[1],(right-.5)/ATLAS_SIZE[0],1-(top+.5)/ATLAS_SIZE[1]]};
}
/** Keep every pose inside the visible scene and inside the corridor, including duos. */
export function creatureLayout(kind:CreatureKind,count:number,width:number,height:number,depth:number,insets:CombatInsets=DEFAULT_INSETS):CreatureLayout{
  const frames=CREATURE_FRAMES[kind].map((_,pose)=>creatureFrame(kind,pose));
  const maxHeight=Math.max(...frames.map(f=>f.height)),maxWidth=Math.max(...frames.map(f=>f.width));
  const focal=height/(2*Math.tan(VERTICAL_FOV/2)),distance=Math.max(.7,depth),n=Math.max(1,count);
  const top=Math.min(insets.top,height*.35),bottom=Math.max(top+30,height-insets.bottom);
  const availableHeight=bottom-top,availableWidth=Math.max(40,width-32);
  const gap=.18,groupWidth=n*maxWidth+(n-1)*gap;
  const scale=Math.min(1,availableHeight*distance/(maxHeight*focal),availableWidth*distance/(groupWidth*focal),2.28/groupWidth);
  const offsets=Array.from({length:n},(_,i)=>(i-(n-1)/2)*(maxWidth+gap)*scale);
  const projectedBottom=height*.5+CAMERA_HEIGHT/distance*focal;
  return{scale,offsets,shiftY:2*(bottom-projectedBottom)/Math.max(1,height),bottom,top,maxHeight,maxWidth};
}
export function projectCreatureCenter(kind:CreatureKind,count:number,index:number,width:number,height:number,depth:number,right=0,insets:CombatInsets=DEFAULT_INSETS){
  const layout=creatureLayout(kind,count,width,height,depth,insets),frame=creatureFrame(kind,0),focal=height/(2*Math.tan(VERTICAL_FOV/2));
  return{x:50+(right+(layout.offsets[index]??0))/Math.max(.7,depth)*focal/Math.max(1,width)*100,y:(layout.bottom-frame.height*layout.scale*.5/Math.max(.7,depth)*focal)/Math.max(1,height)*100};
}
