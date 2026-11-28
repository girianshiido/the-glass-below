import {ANNEALING,WAREHOUSE,ANNEALING_DOOR,ANNEALING_RETURN,ANNEALING_SERVICE,SERVICE_DOOR,BELL_BARRIER,EXPEDITION_FIXTURES} from './expedition-world.ts';
import {burnersLit,cryptAccess,keeperAccess,lowWater,isFloatingWalkway} from './expedition-state.ts';
import {ESTUARY_STAGE,ESTUARY,LOCKWORKS,ROAD_TO_ESTUARY,COASTAL_GATE,COASTAL_BRIDGE_TILES,ESTUARY_LINK,SLUICE_WHEEL,MOORING,TIDE_GATE} from './estuary-world.ts';
import type {Zone} from './campaign.ts';
import type {Game} from './engine.ts';
import {MAP as OLD_MAP,ENCOUNTERS as OLD_ENCOUNTERS,DIRECTIONS} from './world.ts';
import type {Point,EncounterDef} from './world.ts';
export interface Building{x:number;y:number;w:number;d:number;h:number;roof:number;kind:'inn'|'shop'|'house'|'hall'|'factory'|'tower'}
export interface Entrance extends Point{id:'inn'|'shop'|'neris';direction:number}
export interface Resident extends Point{id:'elara'|'inn'|'shop'|'lys';name:string;frame:number}
export interface Passage extends Point{id:string;to:Zone;spawn:Point;direction:number;label:string;exitDirection?:number}
export interface RegionWorld{zone:Zone;map:string[];spawn:Point;direction:number;buildings:Building[];residents:Resident[];entrances:Entrance[];passages:Passage[];encounters:EncounterDef[];ceiling:number;outdoor:boolean}
const open=(w:number,h:number)=>Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'#':'.'));
const rect=(m:string[][],x:number,y:number,w:number,h:number,c='#')=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)m[j][i]=c;};
const village=open(21,17),road=Array.from({length:21},()=>Array(25).fill('#')),works=open(23,19);
const buildings:Building[]=[{x:3,y:5,w:3,d:3,h:4.7,roof:1.9,kind:'inn'},{x:15,y:8,w:3,d:3,h:4.6,roof:1.7,kind:'shop'},{x:3,y:11,w:3,d:3,h:4.5,roof:1.7,kind:'house'},{x:15,y:2,w:3,d:3,h:4.8,roof:1.8,kind:'house'},{x:8,y:2,w:5,d:3,h:5.1,roof:2.2,kind:'hall'},{x:13,y:2,w:1,d:2,h:6.5,roof:1.6,kind:'tower'}];
for(const b of buildings)rect(village,b.x,b.y,b.w,b.d);
export const VILLAGE_DETAILS=[[10,8],[8,8],[12,8],[7,9],[13,9]]as const;
village[8][20]='.';for(const[x,y]of VILLAGE_DETAILS)village[y][x]='#';
// A narrow woodland trail, with small clearings and connected steps at its bends.
let previous=10;for(let x=0;x<25;x++){const center=x<9?10:x<17?10-Math.floor((x-8)/2):6;for(let y=Math.min(previous,center);y<=Math.max(previous,center);y++)road[y][x]='.';if(x<4)for(let y=9;y<=11;y++)road[y][x]='.';previous=center;}
rect(road,10,8,3,3,'.');rect(road,18,5,3,3,'.');road[10][0]='.';road[6][24]='.';
// The spur reaches the tollgate before crossing the inlet and joining the quay road.
for(let y=5;y<8;y++)road[y][COASTAL_GATE.x]='.';
for(const {x,y} of COASTAL_BRIDGE_TILES)road[y][x]='.';
// Broad furnace and workshop halls, with a traversable opening between their columns.
rect(works,3,4,4,4);rect(works,16,4,4,4);rect(works,3,12,4,3);rect(works,17,12,3,3);
for(const [x,y]of [[9,5],[13,5],[9,12],[13,12]])works[y][x]='#';
works[17][11]='.';works[18][11]='.';works[0][19]='.';works[ANNEALING_DOOR.y][ANNEALING_DOOR.x]='.';works[SERVICE_DOOR.y][SERVICE_DOOR.x]='.';works[3][22]='.';
// Preserve quest landmarks and the old encounter IDs while opening genuinely large crypt rooms.
const crypt=OLD_MAP.map(r=>r.split(''));
rect(crypt,11,1,7,4,'.');rect(crypt,3,5,5,3,'.');rect(crypt,11,10,7,2,'.');
rect(crypt,11,10,7,3,'.');
for(let x=11;x<=16;x++){crypt[9][x]='#';crypt[13][x]='#';}for(let y=10;y<=13;y++)crypt[y][10]='#'; // The northern copper gate is the only entrance to the great hall.
const finish=(m:string[][])=>m.map(r=>r.join(''));
export const REGION_WORLDS:Record<Zone,RegionWorld>={
 village:{zone:'village',map:finish(village),spawn:{x:10,y:11},direction:3,buildings,residents:[{id:'elara',name:'Elder Elara',frame:0,x:9,y:6}],entrances:[{id:'inn',x:4,y:8,direction:3},{id:'shop',x:16,y:11,direction:3}],passages:[{id:'pine-gate',x:20,y:8,to:'road',spawn:{x:0,y:10},direction:0,label:'Old Pine Road'}],encounters:[],ceiling:0,outdoor:true},
 road:{zone:'road',map:finish(road),spawn:{x:1,y:10},direction:0,buildings:[],residents:[],entrances:[],passages:[{id:'village-return',x:0,y:10,to:'village',spawn:{x:20,y:8},direction:2,label:'Greyhaven'},{id:'glassworks-door',x:24,y:6,to:'glassworks',spawn:{x:11,y:16},direction:3,label:'Enter the glassworks'},{id:'coastal-crossing',...ROAD_TO_ESTUARY,to:'estuary',spawn:ESTUARY_LINK,direction:0,label:'Follow the causeway to Saltreach'}],encounters:[{id:'road-shards',x:6,y:10,kind:'scavenger'},{id:'road-hollow',x:13,y:8,kind:'scavenger'},{id:'road-lantern',x:20,y:6,kind:'wraith'},{id:'pine-root',x:9,y:10,kind:'scavenger'},{id:'pine-bend',x:17,y:6,kind:'scavenger'}],ceiling:0,outdoor:true},
 glassworks:{zone:'glassworks',map:finish(works),spawn:{x:11,y:16},direction:3,buildings:[],residents:[{id:'lys',name:'Lys',frame:3,x:18,y:3}],entrances:[],passages:[{id:'works-return',x:11,y:18,to:'road',spawn:{x:23,y:6},direction:2,label:'Old Pine Road'},{id:'annealing-door',...ANNEALING_DOOR,exitDirection:2,to:'annealing',spawn:ANNEALING_RETURN,direction:3,label:'Enter the annealing wing'},{id:'annealing-shortcut',...SERVICE_DOOR,exitDirection:2,to:'annealing',spawn:ANNEALING_SERVICE,direction:3,label:'Enter the annealing wing by the service passage'},{id:'crypt-stairs',x:19,y:0,to:'crypts',spawn:{x:1,y:1},direction:0,label:'Descend into the crypts'}],encounters:[{id:'furnace',kind:'wraith',x:11,y:7},{id:'kiln-crawler',kind:'scavenger',x:7,y:10},{id:'loading-bay',kind:'wraith',x:20,y:10}],ceiling:6.5,outdoor:false},
 crypts:{zone:'crypts',map:finish(crypt),spawn:{x:1,y:1},direction:0,buildings:[],residents:[],entrances:[],passages:[{id:'crypt-return',x:1,y:1,to:'glassworks',spawn:{x:19,y:1},direction:1,label:'Climb to the glassworks'},{id:'warden-stairs',x:17,y:13,to:'glassworks',spawn:{x:19,y:1},direction:1,label:'Climb to the glassworks'}],encounters:OLD_ENCOUNTERS.map(e=>({...e})),ceiling:4.3,outdoor:false},
 estuary:ESTUARY, lockworks:LOCKWORKS, annealing:ANNEALING, warehouse:WAREHOUSE,
};
export function regionOf(g:Game){return REGION_WORLDS[g.campaign?.zone??'crypts'];}
export function regionWall(zone:Zone,x:number,y:number){return REGION_WORLDS[zone].map[y]?.[x]!=='.';}
export function regionObstacle(g:Game,point:Point):string|undefined {
  const zone=g.campaign?.zone;
  if(zone==='road'&&point.x===COASTAL_GATE.x&&point.y===COASTAL_GATE.y&&!coastalGateOpen(g))
    return 'The coastal bridge is locked. Speak to Elder Elara.';
  if(zone==='estuary'&&isFloatingWalkway(point)&&lowWater(g))return 'The floating walkway sits below the quay. Raise the water at the sluice.';
  if(zone==='lockworks'&&point.x===BELL_BARRIER.x&&point.y===BELL_BARRIER.y&&!keeperAccess(g))
    return 'The bell bridge is held by the relay. Read the freight register and trace the signal.';
}

export function regionSight(zone:Zone,a:Point,b:Point,gateOpen=true){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*12));for(let i=1;i<=n;i++){const x=Math.round(a.x+(b.x-a.x)*i/n),y=Math.round(a.y+(b.y-a.y)*i/n);if(regionWall(zone,x,y)||zone==='crypts'&&!gateOpen&&x===17&&y===9)return false;}return true;}
export function regionEncounter(id:string){for(const w of Object.values(REGION_WORLDS)){const e=w.encounters.find(e=>e.id===id);if(e)return e;}return undefined;}
const CELL_METRES=2.6;
export const INTERACTION_REACH=1.35;
export const RESIDENT_STOP_DISTANCE=1.15;
/** Distances use the rendered viewpoint, not the next logical movement cell. */
function withinReach(g:Game,origin:Point,target:Point){return Math.hypot(target.x-origin.x,target.y-origin.y)*CELL_METRES<=INTERACTION_REACH+1e-8&&regionSight(g.campaign!.zone,origin,target,g.gateOpen);}
function activeResidents(g:Game){return regionOf(g).residents.filter(n=>!(n.id==='lys'&&g.campaign?.recruited));}
export function nearbyResident(g:Game,origin:Point=g.position){if(!g.campaign||g.phase!=='explore')return;return activeResidents(g).find(n=>withinReach(g,origin,n));}
/** One final, short approach lets the player reach a person without occupying their cell. */
export function residentApproach(g:Game,relative=0):Point|undefined{if(!g.campaign||g.phase!=='explore')return;const[dx,dy]=DIRECTIONS[(g.direction+relative+4)%4],n=activeResidents(g).find(n=>n.x===g.position.x+dx&&n.y===g.position.y+dy);if(!n||!regionSight(g.campaign.zone,g.position,n,g.gateOpen))return;return{x:n.x-dx*RESIDENT_STOP_DISTANCE/CELL_METRES,y:n.y-dy*RESIDENT_STOP_DISTANCE/CELL_METRES};}
export function nearbyPassage(g:Game){if(!g.campaign||g.phase!=='explore')return undefined;return regionOf(g).passages.find(p=>Math.abs(p.x-g.position.x)+Math.abs(p.y-g.position.y)<=1);}
export function passageLocked(g:Game,p:Passage){
  const c=g.campaign;
  if(!c)return false;
  if(p.id==='pine-gate')return c.stage<1||!c.villageGateOpen||c.gateOpenedAt!==undefined&&g.playTime-c.gateOpenedAt<.9;
  if(p.id==='glassworks-door')return c.stage<2;
  if(p.id==='crypt-stairs')return !cryptAccess(g);
  if(p.id==='annealing-service'||p.id==='annealing-shortcut')return !(c.expedition?.ledger&&burnersLit(g));
  if(p.id==='warehouse-walkway')return c.stage<ESTUARY_STAGE.sluice||lowWater(g);
  if(p.id==='warehouse-return')return lowWater(g);
  if(p.id==='warehouse-culvert')return !c.expedition?.culvert||!lowWater(g);
  if(p.id==='coastal-crossing')return !coastalGateOpen(g);
  if(p.id==='lock-stairs')return !lowWater(g);
  if(p.id==='bell-stairs')return c.stage<ESTUARY_STAGE.mooring;
  if(p.id==='bell-shortcut')return !c.bellShortcut||!lowWater(g);
  return false;
}

function cShortcutMessage(g:Game){
  return g.campaign?.bellShortcut?'The lock is flooded. Lower the water at the sluice.':'The tower door opens from the other side.';
}
export function passageHint(g:Game,p:Passage){
  if(!passageLocked(g,p))return p.label;
  const stage=g.campaign!.stage;
  const locked:Record<string,string>={
    'pine-gate':stage<1?'Speak to Elder Elara before leaving Greyhaven.':g.campaign!.villageGateOpen?'The pine gate is opening…':'Open the pine gate',
    'glassworks-door':'Clear the three threats on the road first.',
    'crypt-stairs':g.campaign!.recruited?'Search the annealing wing for the ledger, or relight both burners.':'Find Lys before descending.',
    'annealing-service':'The service passage needs both draft and the courier’s release stamp.',
    'annealing-shortcut':'The service passage opens with both burners lit and the ledger recovered.',
    'warehouse-walkway':stage<ESTUARY_STAGE.sluice?'Ask the ferrymaster about the bonded warehouse.':'Raise the sluice to float the walkway.',
    'warehouse-return':'Use the culvert, or raise the walkway from Saltreach.',
    'warehouse-culvert':lowWater(g)?'The culvert bolts open from below.':'Lower the water before entering the culvert.',
    'coastal-crossing':'The coastal bridge is locked.',
    'lock-stairs':'Water covers the lower stairs.',
    'bell-stairs':'The Keeper is still guarding the tower stairs.',
    'bell-shortcut':cShortcutMessage(g),
  };
  return locked[p.id]??p.label;
}

export function nearbyFixture(g:Game,origin:Point=g.position){
  const c=g.campaign;
  if(!c||g.phase!=='explore')return;
  if(Math.hypot(origin.x-g.position.x,origin.y-g.position.y)*CELL_METRES>INTERACTION_REACH)return;
  const {x,y}=g.position;
  const p=c.expedition;
  for(const [action,fixture] of Object.entries(EXPEDITION_FIXTURES)){
    const id=action as keyof typeof EXPEDITION_FIXTURES;
    if(fixture.zone===c.zone&&fixture.x===x&&fixture.y===y){
      // Records can still be read after the first discovery.
      if((id==='westBurner'||id==='eastBurner'||id==='lantern')&&p?.[id])return;
      return {id,label:fixture.label};
    }
  }
  if(c.zone!=='estuary')return;
  if(x===SLUICE_WHEEL.x&&y===SLUICE_WHEEL.y)
    return lowWater(g)?{id:'raise-lock',label:'Raise the water'}:{id:'drain-lock',label:'Lower the water'};
  if(x===MOORING.x&&y===MOORING.y&&c.stage===ESTUARY_STAGE.mooring&&c.bellShortcut)return {id:'part-ways',label:'Speak to Lys at the mooring'};
  if(x===TIDE_GATE.x&&y===TIDE_GATE.y&&c.stage===ESTUARY_STAGE.alone)return {id:'secure-tide',label:'Close the tide gate'};
}

export function revealRegion(g:Game){const c=g.campaign;if(!c)return;const w=regionOf(g),seen=new Set(c.worldSeen?.[c.zone]??[]);for(let y=Math.max(0,g.position.y-10);y<Math.min(w.map.length,g.position.y+11);y++)for(let x=Math.max(0,g.position.x-10);x<Math.min(w.map[0].length,g.position.x+11);x++){if(regionSight(c.zone,g.position,{x,y},g.gateOpen))seen.add(`${x},${y}`);else if(regionWall(c.zone,x,y))for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(regionSight(c.zone,g.position,{x:x+dx*.6,y:y+dy*.6},g.gateOpen))seen.add(`${x},${y}`);}c.worldSeen??={};c.worldSeen[c.zone]=[...seen];}

const ROAD_OFFSET={x:20,y:-2};
const ESTUARY_OFFSET={
  x:ROAD_OFFSET.x+ROAD_TO_ESTUARY.x-ESTUARY_LINK.x,
  y:ROAD_OFFSET.y+ROAD_TO_ESTUARY.y-ESTUARY_LINK.y,
};
export const COASTAL_OUTDOORS=['village','road','estuary'] as const;
export function isCoastalOutdoor(zone:Zone){
  return COASTAL_OUTDOORS.some(outdoor=>outdoor===zone);
}
export const GLASSWORKS_INTERIOR=['glassworks','annealing'] as const;
export function isGlassworksInterior(zone:Zone){
  return GLASSWORKS_INTERIOR.some(room=>room===zone);
}
export function coastalGateOpen(g:Game){return (g.campaign?.stage??0)>=ESTUARY_STAGE.trail;}

// The wing's south wall abuts the west wall of the glassworks.
const ANNEALING_OFFSET={
  x:ANNEALING_DOOR.x-1-ANNEALING_RETURN.y,
  y:ANNEALING_DOOR.y+ANNEALING_RETURN.x,
};
export function regionOffset(zone:Zone):Point{
  if(zone==='road')return ROAD_OFFSET;
  if(zone==='estuary')return ESTUARY_OFFSET;
  if(zone==='annealing')return ANNEALING_OFFSET;
  return {x:0,y:0};
}
export function regionRotation(zone:Zone){return zone==='annealing'?-1:0;}
function rotateRegionPoint(point:Point,quarterTurns:number):Point{
  if(quarterTurns<0)return {x:point.y,y:-point.x};
  if(quarterTurns>0)return {x:-point.y,y:point.x};
  return point;
}
export function regionScenePoint(zone:Zone,point:Point):Point{
  const rotated=rotateRegionPoint(point,regionRotation(zone)),offset=regionOffset(zone);
  return {x:rotated.x+offset.x,y:rotated.y+offset.y};
}
function regionLocalPoint(zone:Zone,point:Point):Point{
  const offset=regionOffset(zone);
  return rotateRegionPoint({x:point.x-offset.x,y:point.y-offset.y},-regionRotation(zone));
}
export function rebaseRegionView(from:Zone,to:Zone,view:Point&{yaw:number}){
  const position=regionLocalPoint(to,regionScenePoint(from,view));
  return {...position,yaw:view.yaw+(regionRotation(from)-regionRotation(to))*Math.PI/2};
}
export function sharedOutdoors(a:Zone,b:Zone){return isCoastalOutdoor(a)&&isCoastalOutdoor(b);}
export function sharedScene(a:Zone,b:Zone){
  return sharedOutdoors(a,b)||isGlassworksInterior(a)&&isGlassworksInterior(b);
}
/** The visible door sits just inside the front edge of its doorstep cell. */
export function entrancePoint(p:Entrance):Point{const[dx,dy]=DIRECTIONS[p.direction];return{x:p.x+dx*.45,y:p.y+dy*.45};}
export function entranceAhead(g:Game,origin:Point=g.position){const door=nearbyEntrance(g,origin);return door?.direction===g.direction?door:undefined;}
export function nearbyEntrance(g:Game,origin:Point=g.position){if(!g.campaign||g.phase!=='explore')return;return regionOf(g).entrances.find(p=>{const target=entrancePoint(p),[dx,dy]=DIRECTIONS[p.direction];return (origin.x-target.x)*dx+(origin.y-target.y)*dy<=0&&withinReach(g,origin,target);});}
export function encounterPresent(g:Game,id:string){
  const stage=g.campaign?.stage??0;
  if(id==='tide-stray'&&stage<ESTUARY_STAGE.alone)return false;
  return !g.cleared.has(id)||g.roaming.has(id);
}
export function roadThreat(g:Game){if(g.campaign?.zone!=='road'||g.phase!=='explore')return;return regionOf(g).encounters.filter(e=>encounterPresent(g,e.id)&&Math.hypot(e.x-g.position.x,e.y-g.position.y)<=2.15&&regionSight('road',g.position,e)).sort((a,b)=>Math.hypot(a.x-g.position.x,a.y-g.position.y)-Math.hypot(b.x-g.position.x,b.y-g.position.y))[0];}
const trailSegments:{ax:number;ay:number;bx:number;by:number}[]=[];
for(let y=0;y<road.length;y++)for(let x=0;x<road[0].length;x++)if(road[y][x]==='.')for(const[dx,dy]of [[1,0],[0,1]])if(road[y+dy]?.[x+dx]==='.')trailSegments.push({ax:x,ay:y,bx:x+dx,by:y+dy});
/** Soft, uneven banks follow the connected path rather than the square tile perimeter. */
export function trailCoverage(x:number,y:number){let distance=Infinity;for(const s of trailSegments){const dx=s.bx-s.ax,dy=s.by-s.ay,t=Math.max(0,Math.min(1,((x-s.ax)*dx+(y-s.ay)*dy)/(dx*dx+dy*dy)));distance=Math.min(distance,Math.hypot(x-s.ax-t*dx,y-s.ay-t*dy));}const rough=.047*Math.sin(x*17+y*23)+.035*Math.sin(x*37-y*13)+.025*Math.sin(x*7+y*9),width=.48+.065*Math.sin(x*1.9+y*.8)+rough;return Math.max(0,Math.min(1,(width+.13-distance)/.22));}
