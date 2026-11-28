import {EXPEDITION_FLAGS,isFloatingWalkway,lowWater} from './expedition-state.ts';
import {regionWall,REGION_WORLDS,revealRegion} from './region-world.ts';
import {CAMPAIGN_ENCOUNTERS,ROAD_ENCOUNTERS,refreshStats,xpNeeded,ESTUARY_STAGE,activeHero,CAMPAIGN_PATROL_IDS,CAMPAIGN_PATROLS,CAMPAIGN_PATROL_LIMIT} from './campaign.ts';
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
      const c=s.campaign,zones=Object.keys(REGION_WORLDS);
      if(!c||!zones.includes(c.zone)||!Number.isInteger(c.stage)||c.stage<0||c.stage>ESTUARY_STAGE.joined||typeof c.recruited!=='boolean'||c.recruited!==(c.stage>=5)||!Number.isInteger(c.level)||c.level<1||c.level>20||!Number.isFinite(c.xp)||c.xp<0||c.level<20&&c.xp>=xpNeeded(c.level)||!Number.isInteger(c.potions)||c.potions<0||c.potions>9||!['iron','tempered'].includes(c.weapon)||!['travel','warden'].includes(c.armor)||typeof c.charm!=='boolean'||typeof c.introRead!=='boolean')return null;
      if(!Array.isArray(c.roadCleared)||c.roadCleared.some((id:string)=>!ROAD_ENCOUNTERS.some(e=>e.id===id))||new Set(c.roadCleared).size!==c.roadCleared.length||!Array.isArray(c.visited)||c.visited.some((z:string)=>!zones.includes(z)))return null;
      if(!c.roadAwayAt||typeof c.roadAwayAt!=='object'||Array.isArray(c.roadAwayAt)||Object.entries(c.roadAwayAt).some(([id,t])=>!ROAD_ENCOUNTERS.some(e=>e.id===id)||typeof t!=='number'||!Number.isFinite(t)||t<0))return null;
      if(c.zone==='estuary'&&c.stage<ESTUARY_STAGE.trail||c.zone==='lockworks'&&c.stage<ESTUARY_STAGE.drained)return null;
      if(c.bellShortcut!==undefined&&typeof c.bellShortcut!=='boolean'||c.bellShortcut&&c.stage<ESTUARY_STAGE.mooring||c.stage>=ESTUARY_STAGE.alone&&!c.bellShortcut)return null;
      if(c.sluiceLoweredAt!==undefined&&(!Number.isFinite(c.sluiceLoweredAt)||c.sluiceLoweredAt<0||c.sluiceLoweredAt>s.playTime||c.stage<ESTUARY_STAGE.drained))return null;
      if(c.zone==='warehouse'&&c.stage<ESTUARY_STAGE.sluice||c.zone==='annealing'&&c.stage<2)return null;
      if(c.expedition!==undefined){
        const progress=c.expedition;
        if(!progress||typeof progress!=='object'||Array.isArray(progress))return null;
        if(EXPEDITION_FLAGS.some(key=>progress[key]!==undefined&&typeof progress[key]!=='boolean'))return null;
        if(progress.waterLow!==undefined&&typeof progress.waterLow!=='boolean')return null;
        const at=progress.tideChangedAt;
        if(at!==undefined&&(!Number.isFinite(at)||at<0||at>s.playTime))return null;
        if(progress.courierReported&&!progress.ledger||progress.lanternReturned&&!progress.lantern||progress.relayAligned&&(!progress.freight||!progress.signal))return null;
      }
      g.campaign=structuredClone(c);
      if(c.expedition===undefined){
        g.campaign!.expedition={
          priorCryptAccess:c.zone==='crypts'||c.visited.includes('crypts'),
          priorKeeperAccess:c.stage===ESTUARY_STAGE.drained,
        };
      }
      refreshStats(g);
    }
    let position={...s.position},direction=s.direction;
    if(g.campaign){const c=g.campaign;if(c.worldVersion!==undefined&&c.worldVersion!==1&&c.worldVersion!==2&&c.worldVersion!==3)return null;if(c.worldVersion!==2&&c.worldVersion!==3){if(c.zone!=='crypts'||regionWall(c.zone,position.x,position.y)){position={...REGION_WORLDS[c.zone].spawn};direction=REGION_WORLDS[c.zone].direction;}c.worldVersion=3;c.villageGateOpen=c.stage>=1;c.gateOpenedAt=undefined;c.worldSeen={};}else{if(c.worldVersion===2){if(c.zone==='village'){position={...REGION_WORLDS.village.spawn};direction=3;}else if(regionWall(c.zone,position.x,position.y)){const tiles=REGION_WORLDS[c.zone].map.flatMap((row,y)=>[...row].flatMap((v,x)=>v==='.'?[{x,y}]:[]));tiles.sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y));position=tiles[0];}c.worldVersion=3;c.worldSeen={...c.worldSeen,village:[],road:[]};}if(regionWall(c.zone,position.x,position.y)||typeof c.villageGateOpen!=='boolean'||c.gateOpenedAt!==undefined&&(!Number.isFinite(c.gateOpenedAt)||c.gateOpenedAt<0))return null;}
      if(c.zone==='estuary'&&isFloatingWalkway(position)&&lowWater(g))position={x:23,y:9};
      if(c.worldSeen!==undefined){if(!c.worldSeen||typeof c.worldSeen!=='object'||Array.isArray(c.worldSeen))return null;for(const[zone,cells]of Object.entries(c.worldSeen)){if(!(zone in REGION_WORLDS)||!Array.isArray(cells)||cells.length>1500||cells.some(v=>typeof v!=='string'||!/^\d+,\d+$/.test(v)))return null;}}
    }else if(wall(position.x,position.y))return null;
    for(let i=0;i<2;i++){const h=s.heroes[i];if(!h||!Number.isFinite(h.hp)||!Number.isFinite(h.mp)||h.hp<0||h.hp>g.heroes[i].maxHp||h.mp<0||h.mp>g.heroes[i].maxMp)return null;g.heroes[i].hp=h.hp;g.heroes[i].mp=h.mp;}
    if(g.heroes.every((h,i)=>!activeHero(g,i)||h.hp<=0))return null;
    for(const k of ['key','gateOpen','chestOpen','shrineUsed']as const){if(typeof s[k]!=='boolean')return null;g[k]=s[k];}
    if(g.gateOpen&&!g.key||g.key!==g.chestOpen||!g.gateOpen&&(!g.campaign||g.campaign.zone==='crypts')&&same(position,GATE))return null;
    if(!Array.isArray(s.cleared)||s.cleared.some((id:unknown)=>typeof id!=='string'||![...ENCOUNTERS,...CAMPAIGN_ENCOUNTERS].some(e=>e.id===id)))return null;
    if(!Array.isArray(s.seen)||s.seen.length>WIDTH*HEIGHT||s.seen.some((v:unknown)=>typeof v!=='string'||!/^\d+,\d+$/.test(v)||v.split(',').some((n,i)=>+n>=(i===0?WIDTH:HEIGHT))))return null;
    if(!Number.isFinite(s.gold)||s.gold<0||!Number.isFinite(s.playTime)||s.playTime<0)return null;
    if(typeof s.complete!=='boolean'||s.complete&&!s.cleared.includes('guardian'))return null;
    const patrolIds=g.campaign?CAMPAIGN_PATROL_IDS:new Set<string>(PATROL_SITES);
    if(s.roaming!==undefined&&(!Array.isArray(s.roaming)||new Set(s.roaming).size!==s.roaming.length||s.roaming.some((id:string)=>!patrolIds.has(id)||!s.cleared.includes(id))))return null;
    const roaming:string[]=s.roaming??[];
    if(g.campaign?CAMPAIGN_PATROLS.some(({sites})=>sites.filter(site=>roaming.includes(site.id)).length>CAMPAIGN_PATROL_LIMIT):roaming.length>1)return null;
    if(s.respawnAt!==undefined&&(!s.respawnAt||typeof s.respawnAt!=='object'||Array.isArray(s.respawnAt)||Object.entries(s.respawnAt).some(([id,t])=>!patrolIds.has(id)||typeof t!=='number'||!Number.isFinite(t)||t<0)))return null;
    g.roaming=new Set(roaming);
    g.respawnAt={...s.respawnAt};
    for(const id of patrolIds){
      const deadline=g.respawnAt[id];
      const oldDeparture=g.campaign?.roadAwayAt[id];
      if(deadline!==undefined)g.respawnAt[id]=Math.min(deadline,s.playTime+RESPAWN_DELAY);
      else if(s.cleared.includes(id)&&(oldDeparture!==undefined||!g.campaign))
        g.respawnAt[id]=oldDeparture===undefined?s.playTime+RESPAWN_DELAY:Math.min(oldDeparture,s.playTime)+RESPAWN_DELAY;
    }
    if(g.campaign)g.campaign.roadAwayAt={};
    g.position=position;g.direction=direction;g.cleared=new Set(s.cleared);g.seen=new Set(s.seen);g.gold=s.gold;g.playTime=s.playTime;g.phase=s.complete?'complete':'explore';g.message='';if(g.campaign)revealRegion(g);return g;
  }catch{return null;}
}
export function save(g:Game){try{localStorage.setItem(KEY,serialize(g));return true;}catch{return false;}}
export function load(){try{const raw=localStorage.getItem(KEY);return raw?deserialize(raw):null;}catch{return null;}}
