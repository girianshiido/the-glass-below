import type {Feedback,Game} from './engine.ts';
import type {Camera} from './renderer.ts';
import type {Sound} from './audio-state.ts';
import {ENCOUNTERS} from './world.ts';
import {projectCreatureCenter,DEFAULT_INSETS} from './combat-view.ts';
import type {CombatInsets} from './combat-view.ts';
import {drawThinImpact} from './impact-art.ts';
export interface EffectSpec {cell:number;duration:number;sound:Sound;rotation:number;art:'stroke'|'atlas'}
export function effectFor(f:Feedback):EffectSpec{
  if(f.kind==='ice')return{cell:4,duration:.65,sound:'frost',rotation:0,art:'atlas'};
  if(f.kind==='heal')return{cell:5,duration:.9,sound:'heal',rotation:0,art:'atlas'};
  if(f.kind==='break')return{cell:6,duration:.34,sound:'fracture',rotation:0,art:'stroke'};
  if(f.kind==='hurt')return{cell:7,duration:.24,sound:'hit',rotation:(f.id%3-1)*13,art:'stroke'};
  const variant=f.id%4;return{cell:variant,duration:.23+variant*.015,sound:`slash-${variant+1}`as Sound,rotation:(f.id%5-2)*8,art:'stroke'};
}
/** Project impacts onto the creature, independent of viewport aspect ratio. */
export function impactAnchor(g:Game,camera:Camera,width:number,height:number,f:Feedback,insets:CombatInsets=DEFAULT_INSETS){
  if(f.hero!==undefined)return{x:f.hero===0?28:72,y:f.kind==='heal'?78:70};
  const encounter=ENCOUNTERS.find(e=>e.id===g.battle?.encounter);if(!encounter)return{x:50,y:52};
  const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),dx=(encounter.x-camera.x)*2.6,dz=(encounter.y-camera.y)*2.6;
  const advance=g.battle?Math.max(0,...g.battle.enemies.map(e=>{const age=g.battle!.time-e.strikeAt;return age>=0&&age<.3?Math.sin(age/.3*Math.PI)*.22:0;})):0;
  const depth=Math.max(.7,c*dx+s*dz-advance),right=-s*dx+c*dz;
  return projectCreatureCenter(encounter.kind,encounter.count,f.enemy??0,width,height,depth,right,insets);
}
interface LiveEffect {element:HTMLDivElement|HTMLCanvasElement;number:HTMLSpanElement;spec:EffectSpec;kind:Feedback['kind'];age:number;particles:HTMLElement[];context?:CanvasRenderingContext2D;size:number;variant:number}
const ATLAS='./art/impacts.png';
export class CombatEffects {
  private active:LiveEffect[]=[];
  private layer:HTMLElement;private viewport:HTMLElement;
  private combatInsets:CombatInsets={...DEFAULT_INSETS};
  setCombatInsets(insets:CombatInsets){this.combatInsets=insets;}
  constructor(layer:HTMLElement,viewport:HTMLElement){this.layer=layer;this.viewport=viewport;}
  spawn(f:Feedback,g:Game,camera:Camera){
    while(this.active.length>=18)this.remove(this.active.shift()!);
    const spec=effectFor(f),anchor=impactAnchor(g,camera,this.viewport.clientWidth,this.viewport.clientHeight,f,this.combatInsets);
    const element=document.createElement(spec.art==='stroke'?'canvas':'div');element.className=`combat-vfx vfx-${f.kind}${spec.art==='stroke'?' thin-impact':''}`;element.style.left=`${anchor.x}%`;element.style.top=`${anchor.y}%`;
    if(spec.art==='atlas'){element.style.backgroundImage=`url("${ATLAS}")`;element.style.backgroundPosition=`${spec.cell%4/3*100}% ${spec.cell<4?0:100}%`;}
    const number=document.createElement('span');number.className=`floater ${f.kind}`;number.textContent=f.text;number.style.left=`${anchor.x}%`;number.style.top=`${anchor.y}%`;
    const particles:HTMLElement[]=[];
    if(['ice','heal'].includes(f.kind))for(let i=0;i<6;i++){const p=document.createElement('i');p.className=`spell-mote mote-${f.kind}`;p.style.left=`${anchor.x}%`;p.style.top=`${anchor.y}%`;particles.push(p);this.layer.append(p);}
    this.layer.append(element,number);
    const size=element.clientWidth||150;let context:CanvasRenderingContext2D|undefined;
    if(spec.art==='stroke'){const canvas=element as HTMLCanvasElement,dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);context=canvas.getContext('2d')??undefined;context?.setTransform(dpr,0,0,dpr,0,0);}
    this.active.push({element,number,spec,kind:f.kind,age:0,particles,context,size,variant:f.id%4});
    return spec.sound;
  }
  tick(dt:number,reduced=false){
    for(let i=this.active.length-1;i>=0;i--){
      const fx=this.active[i];fx.age+=Math.max(0,dt);const t=fx.age/fx.spec.duration;
      if(t>=1){this.remove(fx);this.active.splice(i,1);continue;}
      const attack=Math.min(1,t/.11),fade=t>.48?Math.pow((1-t)/.52,1.3):1;
      const scale=fx.spec.art==='stroke'||reduced?1:fx.kind==='heal'?.85+Math.sin(t*Math.PI/2)*.2:.7+Math.min(1,t*5)*.3;
      if(fx.context)drawThinImpact(fx.context,fx.variant,t,fx.size,fx.kind==='break'?'break':fx.kind==='hurt'?'hurt':'hit',!reduced);
      fx.element.style.opacity=String(attack*fade);fx.element.style.transform=`translate(-50%,-50%) rotate(${fx.spec.rotation+(fx.kind==='heal'&&!reduced?t*28:0)}deg) scale(${scale})`;
      fx.number.style.opacity=String(Math.min(1,t*8)*Math.min(1,(1-t)*3));fx.number.style.transform=`translate(-50%,${reduced?-20:-10-t*65}px)`;
      fx.particles.forEach((p,n)=>{const angle=n*Math.PI/4,travel=reduced?20:t*(fx.kind==='heal'?65:105),up=fx.kind==='heal'?-t*35:t*t*28;p.style.transform=`translate(${Math.cos(angle)*travel}px,${Math.sin(angle)*travel+up}px) rotate(${n*45+t*160}deg)`;p.style.opacity=String(fade*(1-t));});
    }
  }
  clear(){for(const fx of this.active)this.remove(fx);this.active=[];}
  private remove(fx:LiveEffect){fx.element.remove();fx.number.remove();fx.particles.forEach(p=>p.remove());}
}
