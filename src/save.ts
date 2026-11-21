import {CAMPAIGN_ENCOUNTERS,ROAD_ENCOUNTERS,refreshStats,xpNeeded} from './campaign.ts';
import {createGame,PATROL_SITES,RESPAWN_DELAY} from './engine.ts';
import type {Game} from './engine.ts';
import {wall,ENCOUNTERS,WIDTH,HEIGHT,GATE,same} from './world.ts';
const KEY='hollow-depths:save:v1';
export function serialize(g:Game){return JSON.stringify({version:1,campaign:g.campaign,position:g.position,direction:g.direction,heroes:g.heroes.map(h=>({hp:h.hp,mp:h.mp})),cleared:[...g.cleared],roaming:[...g.roaming],respawnAt:g.respawnAt,seen:[...g.seen],key:g.key,gateOpen:g.gateOpen,chestOpen:g.chestOpen,shrineUsed:g.shrineUsed,gold:g.gold,playTime:g.playTime,complete:g.phase==='complete'});}
export function deserialize(raw:string):Game|null{
  try{
    const s=JSON.parse(raw);if(s.version!==1||!s.position||!Number.isInteger(s.position.x)||!Number.isInteger(s.position.y)||!Number.isInteger(s.direction)||s.direction<0||s.direction>3||!Array.isArray(s.heroes)||s.heroes.length!==2)return null;
    const g=createGame();
    if(s.campaign!==undefined){
      const c=s.campaign,zones=['village','road','glassworks','crypts'];
      if(!c||!zones.includes(c.zone)||!Number.isInteger(c.stage)||c.stage<0||c.stage>7||typeof c.recruited!=='boolean'||c.recruited!==(c.stage>=5)||!Number.isInteger(c.level)||c.level<1||c.level>20||!Number.isFinite(c.xp)||c.xp<0||c.level<20&&c.xp>=xpNeeded(c.level)||!Number.isInteger(c.potions)||c.potions<0||c.potions>9||!['iron','tempered'].includes(c.weapon)||!['travel','warden'].includes(c.armor)||typeof c.charm!=='boolean'||typeof c.introRead!=='boolean')return null;
      if(!Array.isArray(c.roadCleared)||c.roadCleared.some((id:string)=>!ROAD_ENCOUNTERS.some(e=>e.id===id))||new Set(c.roadCleared).size!==c.roadCleared.length||!Array.isArray(c.visited)||c.visited.some((z:string)=>!zones.includes(z)))return null;
      if(!c.roadAwayAt||typeof c.roadAwayAt!=='object'||Array.isArray(c.roadAwayAt)||Object.entries(c.roadAwayAt).some(([id,t])=>!ROAD_ENCOUNTERS.some(e=>e.id===id)||typeof t!=='number'||!Number.isFinite(t)||t<0))return null;
      g.campaign=structuredClone(c);refreshStats(g);
    }
    if(g.campaign?.zone==='road'){if(s.position.y!==1||s.position.x<1||s.position.x>9)return null;}else if(wall(s.position.x,s.position.y))return null;
    for(let i=0;i<2;i++){const h=s.heroes[i];if(!h||!Number.isFinite(h.hp)||!Number.isFinite(h.mp)||h.hp<0||h.hp>g.heroes[i].maxHp||h.mp<0||h.mp>g.heroes[i].maxMp)return null;g.heroes[i].hp=h.hp;g.heroes[i].mp=h.mp;}
    if(g.heroes.every(h=>h.hp<=0)||g.campaign&&!g.campaign.recruited&&g.heroes[0].hp<=0)return null;
    for(const k of ['key','gateOpen','chestOpen','shrineUsed']as const){if(typeof s[k]!=='boolean')return null;g[k]=s[k];}
    if(g.gateOpen&&!g.key||g.key!==g.chestOpen||!g.gateOpen&&same(s.position,GATE))return null;
    if(!Array.isArray(s.cleared)||s.cleared.some((id:unknown)=>typeof id!=='string'||![...ENCOUNTERS,...CAMPAIGN_ENCOUNTERS].some(e=>e.id===id)))return null;
    if(!Array.isArray(s.seen)||s.seen.length>WIDTH*HEIGHT||s.seen.some((v:unknown)=>typeof v!=='string'||!/^\d+,\d+$/.test(v)||v.split(',').some((n,i)=>+n>=(i===0?WIDTH:HEIGHT))))return null;
    if(!Number.isFinite(s.gold)||s.gold<0||!Number.isFinite(s.playTime)||s.playTime<0)return null;
    if(typeof s.complete!=='boolean'||s.complete&&!s.cleared.includes('guardian'))return null;
    if(s.roaming!==undefined&&(!Array.isArray(s.roaming)||s.roaming.length>2||s.roaming.some((id:string)=>![...PATROL_SITES,...ROAD_ENCOUNTERS.map(e=>e.id)].some(site=>site===id)||!s.cleared.includes(id))))return null;
    if(s.roaming&&(s.roaming.filter((id:string)=>PATROL_SITES.some(site=>site===id)).length>1||s.roaming.filter((id:string)=>ROAD_ENCOUNTERS.some(e=>e.id===id)).length>1))return null;
    if(s.respawnAt!==undefined&&(!s.respawnAt||typeof s.respawnAt!=='object'||Array.isArray(s.respawnAt)||Object.entries(s.respawnAt).some(([id,t])=>!PATROL_SITES.some(site=>site===id)||typeof t!=='number'||!Number.isFinite(t)||t<0)))return null;
    g.roaming=new Set(s.roaming??[]);g.respawnAt={...s.respawnAt};for(const id of Object.keys(g.respawnAt))g.respawnAt[id]=Math.min(g.respawnAt[id],s.playTime+RESPAWN_DELAY);
    for(const id of PATROL_SITES)if(s.cleared.includes(id)&&g.respawnAt[id]===undefined)g.respawnAt[id]=s.playTime+RESPAWN_DELAY;
    g.position={...s.position};g.direction=s.direction;g.cleared=new Set(s.cleared);g.seen=new Set(s.seen);g.gold=s.gold;g.playTime=s.playTime;g.phase=s.complete?'complete':'explore';g.message='';return g;
  }catch{return null;}
}
export function save(g:Game){try{localStorage.setItem(KEY,serialize(g));return true;}catch{return false;}}
export function load(){try{const raw=localStorage.getItem(KEY);return raw?deserialize(raw):null;}catch{return null;}}
