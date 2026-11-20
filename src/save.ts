import {createGame} from './engine.ts';
import type {Game} from './engine.ts';
import {wall,ENCOUNTERS,WIDTH,HEIGHT,GATE,same} from './world.ts';
const KEY='hollow-depths:save:v1';
export function serialize(g:Game){return JSON.stringify({version:1,position:g.position,direction:g.direction,heroes:g.heroes.map(h=>({hp:h.hp,mp:h.mp})),cleared:[...g.cleared],seen:[...g.seen],key:g.key,gateOpen:g.gateOpen,chestOpen:g.chestOpen,shrineUsed:g.shrineUsed,gold:g.gold,playTime:g.playTime,complete:g.phase==='complete'});}
export function deserialize(raw:string):Game|null{
  try{
    const s=JSON.parse(raw);if(s.version!==1||!s.position||!Number.isInteger(s.position.x)||!Number.isInteger(s.position.y)||wall(s.position.x,s.position.y)||!Number.isInteger(s.direction)||s.direction<0||s.direction>3||!Array.isArray(s.heroes)||s.heroes.length!==2)return null;
    const g=createGame();
    for(let i=0;i<2;i++){const h=s.heroes[i];if(!h||!Number.isFinite(h.hp)||!Number.isFinite(h.mp)||h.hp<0||h.hp>g.heroes[i].maxHp||h.mp<0||h.mp>g.heroes[i].maxMp)return null;g.heroes[i].hp=h.hp;g.heroes[i].mp=h.mp;}
    if(g.heroes.every(h=>h.hp<=0))return null;
    for(const k of ['key','gateOpen','chestOpen','shrineUsed']as const){if(typeof s[k]!=='boolean')return null;g[k]=s[k];}
    if(g.gateOpen&&!g.key||g.key!==g.chestOpen||!g.gateOpen&&same(s.position,GATE))return null;
    if(!Array.isArray(s.cleared)||s.cleared.some((id:unknown)=>typeof id!=='string'||!ENCOUNTERS.some(e=>e.id===id)))return null;
    if(!Array.isArray(s.seen)||s.seen.length>WIDTH*HEIGHT||s.seen.some((v:unknown)=>typeof v!=='string'||!/^\d+,\d+$/.test(v)||v.split(',').some((n,i)=>+n>=(i===0?WIDTH:HEIGHT))))return null;
    if(!Number.isFinite(s.gold)||s.gold<0||!Number.isFinite(s.playTime)||s.playTime<0)return null;
    if(typeof s.complete!=='boolean'||s.complete&&!s.cleared.includes('guardian'))return null;
    g.position={...s.position};g.direction=s.direction;g.cleared=new Set(s.cleared);g.seen=new Set(s.seen);g.gold=s.gold;g.playTime=s.playTime;g.phase=s.complete?'complete':'explore';g.message='Votre expédition reprend.';return g;
  }catch{return null;}
}
export function save(g:Game){try{localStorage.setItem(KEY,serialize(g));return true;}catch{return false;}}
export function load(){try{const raw=localStorage.getItem(KEY);return raw?deserialize(raw):null;}catch{return null;}}
