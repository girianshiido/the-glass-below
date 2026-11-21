import type {Zone} from './campaign.ts';
import type {Game} from './engine.ts';
import {MAP as OLD_MAP,ENCOUNTERS as OLD_ENCOUNTERS} from './world.ts';
import type {Point,EncounterDef} from './world.ts';
export interface Building{x:number;y:number;w:number;d:number;h:number;roof:number;kind:'inn'|'shop'|'house'|'hall'|'factory'|'tower'}
export interface Resident extends Point{id:'elara'|'inn'|'shop'|'lys';name:string;frame:number}
export interface Passage extends Point{id:string;to:Zone;spawn:Point;direction:number;label:string}
export interface RegionWorld{zone:Zone;map:string[];spawn:Point;direction:number;buildings:Building[];residents:Resident[];passages:Passage[];encounters:EncounterDef[];ceiling:number;outdoor:boolean}
const open=(w:number,h:number)=>Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'#':'.'));
const rect=(m:string[][],x:number,y:number,w:number,h:number,c='#')=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)m[j][i]=c;};
const village=open(25,21),road=Array.from({length:21},()=>Array(25).fill('#')),works=open(23,19);
const buildings:Building[]=[{x:3,y:6,w:5,d:4,h:3.3,roof:2,kind:'inn'},{x:17,y:9,w:5,d:4,h:3.1,roof:1.8,kind:'shop'},{x:3,y:14,w:5,d:4,h:3,roof:1.7,kind:'house'},{x:17,y:3,w:5,d:4,h:3.5,roof:2,kind:'house'},{x:9,y:3,w:5,d:4,h:4,roof:2.5,kind:'hall'},{x:15,y:3,w:2,d:2,h:8,roof:2,kind:'tower'}];
for(const b of buildings)rect(village,b.x,b.y,b.w,b.d);
village[10][24]='.';village[10][12]='#';
// A broad two-dimensional forest path joins several clearings, rather than a line of tiles.
for(let x=0;x<25;x++){const center=x<9?10:x<17?10-Math.floor((x-8)/2):6;for(let y=center-2;y<=center+2;y++)if(y>0&&y<20)road[y][x]='.';}
rect(road,9,5,7,9,'.');rect(road,18,3,6,8,'.');road[10][0]='.';road[6][24]='.';
// Broad furnace and workshop halls, with a traversable opening between their columns.
rect(works,3,4,4,4);rect(works,16,4,4,4);rect(works,3,12,4,3);rect(works,17,12,3,3);
for(const [x,y]of [[9,5],[13,5],[9,12],[13,12]])works[y][x]='#';
works[17][11]='.';works[18][11]='.';works[0][19]='.';
// Preserve quest landmarks and the old encounter IDs while opening genuinely large crypt rooms.
const crypt=OLD_MAP.map(r=>r.split(''));
rect(crypt,11,1,7,4,'.');rect(crypt,3,5,5,3,'.');rect(crypt,11,10,7,2,'.');
rect(crypt,11,10,7,3,'.');
for(let x=11;x<=16;x++){crypt[9][x]='#';crypt[13][x]='#';}for(let y=10;y<=13;y++)crypt[y][10]='#'; // The northern copper gate is the only entrance to the great hall.
const finish=(m:string[][])=>m.map(r=>r.join(''));
export const REGION_WORLDS:Record<Zone,RegionWorld>={
 village:{zone:'village',map:finish(village),spawn:{x:12,y:15},direction:3,buildings,residents:[{id:'elara',name:'Elder Elara',frame:0,x:11,y:8},{id:'inn',name:'Mara',frame:1,x:5,y:10},{id:'shop',name:'Tovin',frame:2,x:19,y:13}],passages:[{id:'pine-gate',x:24,y:10,to:'road',spawn:{x:1,y:10},direction:0,label:'Old Pine Road'}],encounters:[],ceiling:0,outdoor:true},
 road:{zone:'road',map:finish(road),spawn:{x:1,y:10},direction:0,buildings:[],residents:[],passages:[{id:'village-return',x:0,y:10,to:'village',spawn:{x:23,y:10},direction:2,label:'Greyhaven'},{id:'glassworks-door',x:24,y:6,to:'glassworks',spawn:{x:11,y:16},direction:3,label:'Enter the glassworks'}],encounters:[{id:'road-shards',x:6,y:10,kind:'scavenger'},{id:'road-hollow',x:13,y:8,kind:'scavenger'},{id:'road-lantern',x:20,y:6,kind:'wraith'}],ceiling:0,outdoor:true},
 glassworks:{zone:'glassworks',map:finish(works),spawn:{x:11,y:16},direction:3,buildings:[],residents:[{id:'lys',name:'Lys',frame:3,x:18,y:3}],passages:[{id:'works-return',x:11,y:18,to:'road',spawn:{x:23,y:6},direction:2,label:'Old Pine Road'},{id:'crypt-stairs',x:19,y:0,to:'crypts',spawn:{x:1,y:1},direction:0,label:'Descend into the crypts'}],encounters:[{id:'furnace',kind:'wraith',x:11,y:7}],ceiling:6.5,outdoor:false},
 crypts:{zone:'crypts',map:finish(crypt),spawn:{x:1,y:1},direction:0,buildings:[],residents:[],passages:[{id:'crypt-return',x:1,y:1,to:'glassworks',spawn:{x:19,y:1},direction:1,label:'Climb to the glassworks'},{id:'warden-stairs',x:17,y:13,to:'glassworks',spawn:{x:19,y:1},direction:1,label:'Climb to the glassworks'}],encounters:OLD_ENCOUNTERS.map(e=>({...e})),ceiling:4.3,outdoor:false},
};
export function regionOf(g:Game){return REGION_WORLDS[g.campaign?.zone??'crypts'];}
export function regionWall(zone:Zone,x:number,y:number){return REGION_WORLDS[zone].map[y]?.[x]!=='.';}
export function regionSight(zone:Zone,a:Point,b:Point,gateOpen=true){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*12));for(let i=1;i<=n;i++){const x=Math.round(a.x+(b.x-a.x)*i/n),y=Math.round(a.y+(b.y-a.y)*i/n);if(regionWall(zone,x,y)||zone==='crypts'&&!gateOpen&&x===17&&y===9)return false;}return true;}
export function regionEncounter(id:string){for(const w of Object.values(REGION_WORLDS)){const e=w.encounters.find(e=>e.id===id);if(e)return e;}return undefined;}
export function nearbyResident(g:Game){if(!g.campaign||g.phase!=='explore')return undefined;return regionOf(g).residents.find(n=>!(n.id==='lys'&&g.campaign!.recruited)&&Math.abs(n.x-g.position.x)+Math.abs(n.y-g.position.y)<=1);}
export function nearbyPassage(g:Game){if(!g.campaign||g.phase!=='explore')return undefined;return regionOf(g).passages.find(p=>Math.abs(p.x-g.position.x)+Math.abs(p.y-g.position.y)<=1);}
export function passageLocked(g:Game,p:Passage){const c=g.campaign;if(!c)return false;if(p.id==='pine-gate')return c.stage<1||!c.villageGateOpen||c.gateOpenedAt!==undefined&&g.playTime-c.gateOpenedAt<.9;if(p.id==='glassworks-door')return c.stage<2;if(p.id==='crypt-stairs')return !c.recruited;return false;}
export function passageHint(g:Game,p:Passage){if(p.id==='pine-gate'&&g.campaign!.stage<1)return 'Speak to Elder Elara before leaving Greyhaven.';if(p.id==='pine-gate'&&!g.campaign!.villageGateOpen)return 'Open the pine gate';if(p.id==='pine-gate'&&g.campaign!.gateOpenedAt!==undefined&&g.playTime-g.campaign!.gateOpenedAt<.9)return 'The pine gate is opening…';if(p.id==='glassworks-door'&&g.campaign!.stage<2)return 'Clear the three threats on the road first.';if(p.id==='crypt-stairs'&&!g.campaign!.recruited)return 'Find Lys before descending.';return p.label;}

export function revealRegion(g:Game){const c=g.campaign;if(!c)return;const w=regionOf(g),seen=new Set(c.worldSeen?.[c.zone]??[]);for(let y=Math.max(0,g.position.y-10);y<Math.min(w.map.length,g.position.y+11);y++)for(let x=Math.max(0,g.position.x-10);x<Math.min(w.map[0].length,g.position.x+11);x++){if(regionSight(c.zone,g.position,{x,y},g.gateOpen))seen.add(`${x},${y}`);else if(regionWall(c.zone,x,y))for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(regionSight(c.zone,g.position,{x:x+dx*.6,y:y+dy*.6},g.gateOpen))seen.add(`${x},${y}`);}c.worldSeen??={};c.worldSeen[c.zone]=[...seen];}
