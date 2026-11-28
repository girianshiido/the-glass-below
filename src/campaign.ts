import {EXPEDITION_FIXTURES} from './expedition-world.ts';
import {cryptAccess,lowWater} from './expedition-state.ts';
import type {ExpeditionProgress} from './expedition-state.ts';
import {ESTUARY_STAGE} from './estuary-world.ts';
export {ESTUARY_STAGE};
import {REGION_WORLDS,regionSight,regionWall,nearbyPassage,passageLocked,sharedOutdoors,nearbyFixture,encounterPresent} from './region-world.ts';
import type {Game} from './engine.ts';
export type Zone='village'|'road'|'glassworks'|'crypts'|'estuary'|'lockworks'|'annealing'|'warehouse';
export interface Campaign {expedition?:ExpeditionProgress;bellShortcut?:boolean;sluiceLoweredAt?:number;worldVersion?:number;worldSeen?:Partial<Record<Zone,string[]>>;villageGateOpen?:boolean;gateOpenedAt?:number;zone:Zone;stage:number;recruited:boolean;level:number;xp:number;potions:number;weapon:'iron'|'tempered';armor:'travel'|'warden';charm:boolean;introRead:boolean;roadCleared:string[];roadAwayAt:Record<string,number>;visited:Zone[]}
export const ROAD_ENCOUNTERS=REGION_WORLDS.road.encounters.filter(e=>e.id.startsWith('road-'));
export const FURNACE=REGION_WORLDS.glassworks.encounters[0];
export const CAMPAIGN_ENCOUNTERS=Object.values(REGION_WORLDS).flatMap(world=>world.encounters);
export const PATROL_DELAY=20;
export const CAMPAIGN_PATROL_LIMIT=2;
export const CAMPAIGN_PATROLS=Object.values(REGION_WORLDS).map(world=>({
  zone:world.zone,
  sites:world.encounters.filter(e=>e.kind!=='sentinel'&&e.id!=='furnace'&&e.id!=='tide-stray'),
})).filter(group=>group.sites.length>0);
export const CAMPAIGN_PATROL_IDS=new Set(CAMPAIGN_PATROLS.flatMap(group=>group.sites.map(e=>e.id)));

export function companion(g:Game):'lys'|'neris'|undefined {
  const c=g.campaign;
  if(!c)return 'lys';
  if(c.stage>=ESTUARY_STAGE.joined)return 'neris';
  if(c.stage>=ESTUARY_STAGE.alone)return;
  return c.recruited?'lys':undefined;
}
export function setupCampaign(g:Game){g.campaign={expedition:{},worldVersion:3,villageGateOpen:false,zone:'village',stage:0,recruited:false,level:1,xp:0,potions:3,weapon:'iron',armor:'travel',charm:false,introRead:false,roadCleared:[],roadAwayAt:{},visited:['village']};g.position={...REGION_WORLDS.village.spawn};g.direction=3;g.gold=20;refreshStats(g);return g;}
export function activeHero(g:Game,index:number){return index===0||companion(g)!==undefined;}
export function xpNeeded(level:number){return 50+(level-1)*35;}
export function refreshStats(g:Game){const c=g.campaign;if(!c)return;const ferrymaster=companion(g)==='neris';g.heroes[1].name=ferrymaster?'Neris':'Lys';g.heroes.forEach((h,i)=>{h.maxHp=(i===0?180:ferrymaster?165:140)+(c.level-1)*(i===0?18:14)+(c.armor==='warden'?20:0);h.maxMp=(i===0?32:ferrymaster?38:44)+(c.level-1)*4+(c.expedition?.courierReported?4:0);h.attack=(i===0?16:ferrymaster?13:10)+(c.level-1)*3+(c.weapon==='tempered'?5:0);h.hp=Math.min(h.hp,h.maxHp);h.mp=Math.min(h.mp,h.maxMp);});}
export function grantXp(g:Game,amount:number){const c=g.campaign;if(!c)return false;c.xp+=amount;let leveled=false;while(c.level<20&&c.xp>=xpNeeded(c.level)){c.xp-=xpNeeded(c.level);c.level++;leveled=true;}refreshStats(g);if(leveled)g.heroes.forEach((h,i)=>{if(activeHero(g,i)){h.hp=h.maxHp;h.mp=h.maxMp;}});return leveled;}
export function campaignVictory(g:Game,id:string,returning:boolean){const c=g.campaign;if(!c)return'';
 const xp=returning?12:id==='bell-keeper'?145:id==='guardian'?120:id==='furnace'?80:55;
 let note=grantXp(g,xp)?`Level ${c.level} reached · HP and MP restored`:`+${xp} XP`;
 if(id.startsWith('road-')){if(!c.roadCleared.includes(id))c.roadCleared.push(id);if(c.roadCleared.length===3&&c.stage===1){c.stage=2;note+=' · An empty courier’s satchel lies beside the lantern. Continue to the glassworks, or report to Elder Elara.';}}
 if(id==='furnace'&&(c.stage===2||c.stage===3)){c.stage=4;note+=' · The furnace falls silent. Speak to Lys.';}
 if(id==='guardian'&&c.stage===5){c.stage=6;note+=' · Return to Greyhaven with the memory prism.';}
 if(id==='bell-keeper'&&c.stage===ESTUARY_STAGE.drained){c.stage=ESTUARY_STAGE.mooring;note+=' · Climb the bell tower stairs, then meet Lys at the mooring.';}
 return note;
}
export function campaignObjective(g:Game){
  const c=g.campaign;
  if(!c)return '';
  const p=c.expedition;
  if(c.stage===5&&!cryptAccess(g))return 'Search the annealing wing for the courier’s ledger, or relight its two burners';
  if(c.stage===ESTUARY_STAGE.sluice&&!p?.freight&&!lowWater(g))return 'Cross the floating walkway and search the warehouse for the freight register';
  if(c.stage===ESTUARY_STAGE.drained){
    if(!p?.priorKeeperAccess){
      if(!p?.freight)return p?.culvert?'Find the freight register in the warehouse via the culvert':'Find the freight register. Use the floating walkway or unbolt the culvert below the quay';
      if(!p?.relayAligned)return lowWater(g)
        ?p?.signal?'Set the bell relay pins using the freight register':'Trace the bell signal beneath the quay'
        :'Lower the water, then return to the bell relay';
    }
    return lowWater(g)?'Cross the bell bridge and confront its Keeper':'Lower the water and cross the bell bridge';
  }
  return [
    'Speak to Elder Elara in Greyhaven','Clear the three threats on the Old Pine Road',
    'Continue through the glassworks entrance, or report to Elara','Investigate the abandoned glassworks',
    'Speak to Lys at the glassworks','Find the memory prism beneath the glassworks','Return to Elder Elara with the prism',
    'Speak to Elara about the bell beyond the pines','Take the old tollgate off Old Pine Road and find the ferrymaster',
    'Turn the sluice wheel above Saltreach','Descend under the quay and find the source of the bell',
    c.bellShortcut?'Meet Lys at the mooring by the cargo boat':'Climb the bell tower stairs and unbolt the door',
    'Follow the lower quay east and close the tide gate','Return to Neris at her boathouse',
    'Chapter III begun · Explore Saltreach with Neris',
  ][c.stage]??'';
}
export function travel(g:Game,zone:Zone){const c=g.campaign;if(!c||g.phase!=='explore')return false;if(zone==='road'&&c.stage<1||zone==='glassworks'&&c.stage<2||zone==='crypts'&&!cryptAccess(g))return false;
 if(zone==='annealing'&&c.stage<2||zone==='warehouse'&&c.stage<ESTUARY_STAGE.sluice)return false;
 if(zone==='estuary'&&c.stage<ESTUARY_STAGE.trail||zone==='lockworks'&&(c.stage<ESTUARY_STAGE.drained||!lowWater(g)))return false;
 const leaving=CAMPAIGN_PATROLS.find(group=>group.zone===c.zone&&group.zone!==zone);
 for(const site of leaving?.sites??[])if(g.cleared.has(site.id)&&!g.roaming.has(site.id))g.respawnAt[site.id]??=g.playTime+PATROL_DELAY;
 c.zone=zone;if(!c.visited.includes(zone))c.visited.push(zone);g.position={...REGION_WORLDS[zone].spawn};g.direction=REGION_WORLDS[zone].direction;g.message='';return true;}
export function updateCampaignPatrols(g:Game){
  const c=g.campaign;
  if(!c)return;
  for(const {zone,sites} of CAMPAIGN_PATROLS){
    let slots=CAMPAIGN_PATROL_LIMIT-sites.filter(site=>g.roaming.has(site.id)).length;
    for(const site of sites){
      if(!g.cleared.has(site.id)||g.roaming.has(site.id))continue;
      const near=c.zone===zone&&(Math.hypot(site.x-g.position.x,site.y-g.position.y)<=3||
        regionSight(zone,g.position,site,g.gateOpen));
      if(near){delete g.respawnAt[site.id];continue;}
      g.respawnAt[site.id]??=g.playTime+PATROL_DELAY;
      if(slots>0&&g.playTime>=g.respawnAt[site.id]){
        g.roaming.add(site.id);
        delete g.respawnAt[site.id];
        slots--;
      }
    }
  }
}
export function campaignAction(g:Game,action:string){const c=g.campaign;if(!c||g.phase!=='explore'&&!(action==='potion'&&g.phase==='combat'))return false;
 if(action==='accept'&&c.stage===0){c.stage=1;return true;}
 if(action==='report'&&c.stage===2){c.stage=3;g.gold+=35;grantXp(g,30);g.message='Road commission complete · +35 shards · +30 XP';return true;}
 if(action==='recruit'&&c.stage===4){c.recruited=true;c.stage=5;refreshStats(g);g.heroes[1].hp=g.heroes[1].maxHp;g.heroes[1].mp=g.heroes[1].maxMp;return true;}
 if(action==='ending'&&c.stage===6){c.stage=7;g.gold+=100;grantXp(g,100);return true;}
 if(action==='follow-bell'&&c.zone==='village'&&c.stage===ESTUARY_STAGE.rumor){c.stage=ESTUARY_STAGE.trail;return true;}
 if(action==='meet-neris'&&c.zone==='estuary'&&c.stage===ESTUARY_STAGE.trail){c.stage=ESTUARY_STAGE.sluice;return true;}
 const p=c.expedition??={};
 const fixture=nearbyFixture(g);
 if(action===fixture?.id){
   if(action in EXPEDITION_FIXTURES){
     const id=action as keyof typeof EXPEDITION_FIXTURES;
     p[id]=true;
     if(id==='signal'&&p.freight)p.relayAligned=true;
     return true;
   }
   if(action==='drain-lock'||action==='raise-lock'){
     if(c.stage<ESTUARY_STAGE.sluice)return false;
     p.waterLow=action==='drain-lock';
     p.tideChangedAt=g.playTime;
     if(c.stage===ESTUARY_STAGE.sluice)c.stage=ESTUARY_STAGE.drained;
     if(p.waterLow)c.sluiceLoweredAt=g.playTime;
     return true;
   }
   if(action==='part-ways'){
     c.stage=ESTUARY_STAGE.alone;
     g.heroes[0].hp=g.heroes[0].maxHp;
     g.heroes[0].mp=g.heroes[0].maxMp;
     return true;
   }
   if(action==='secure-tide'){
     if(!g.cleared.has('tide-stray'))return false;
     c.stage=ESTUARY_STAGE.ferrymaster;
     return true;
   }
 }
 if(action==='report-courier'&&c.zone==='village'&&p.ledger&&!p.courierReported){
   p.courierReported=true;
   refreshStats(g);
   g.heroes.forEach((hero,i)=>{if(activeHero(g,i))hero.mp=Math.min(hero.maxMp,hero.mp+4);});
   return true;
 }
 if(action==='return-lantern'&&c.zone==='estuary'&&p.lantern&&!p.lanternReturned){
   p.lanternReturned=true;
   g.gold+=30;
   c.potions=Math.min(9,c.potions+2);
   return true;
 }
 if(action==='sail-with-neris'&&c.zone==='estuary'&&c.stage===ESTUARY_STAGE.ferrymaster){
   c.stage=ESTUARY_STAGE.joined;
   refreshStats(g);
   g.heroes[1].hp=g.heroes[1].maxHp;
   g.heroes[1].mp=g.heroes[1].maxMp;
   return true;
 }
 if(action==='rest'&&c.zone==='village'&&g.gold>=5){g.gold-=5;g.heroes.forEach(h=>{h.hp=h.maxHp;h.mp=h.maxMp;});return true;}
 if(action==='potion'&&c.potions>0){const hero=g.heroes.filter((_,i)=>activeHero(g,i)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(hero.hp>=hero.maxHp)return false;c.potions--;hero.hp=Math.min(hero.maxHp,hero.hp+80);return true;}
 if(action==='buy-potion'&&c.zone==='village'&&g.gold>=12&&c.potions<9){g.gold-=12;c.potions++;return true;}
 if(action==='buy-weapon'&&c.zone==='village'&&g.gold>=45&&c.weapon==='iron'){g.gold-=45;c.weapon='tempered';refreshStats(g);return true;}
 if(action==='buy-armor'&&c.zone==='village'&&g.gold>=40&&c.armor==='travel'){g.gold-=40;c.armor='warden';refreshStats(g);return true;}
 if(action==='buy-charm'&&c.zone==='village'&&g.gold>=30&&!c.charm){g.gold-=30;c.charm=true;return true;}
 return false;
}
export function roadMove(g:Game,relative:number){const c=g.campaign;if(!c||c.zone!=='road'||g.phase!=='explore')return null;const d=(g.direction+relative+4)%4,dirs=[[1,0],[0,1],[-1,0],[0,-1]],next={x:g.position.x+dirs[d][0],y:g.position.y+dirs[d][1]};if(regionWall('road',next.x,next.y))return false;return REGION_WORLDS.road.encounters.find(e=>e.x===next.x&&e.y===next.y&&encounterPresent(g,e.id))??next;}
export function crossPassage(g:Game,p=nearbyPassage(g)){if(!p||passageLocked(g,p))return false;const from=g.campaign!.zone,direction=g.direction;if(!travel(g,p.to))return false;if(p.id==='bell-stairs')g.campaign!.bellShortcut=true;if(p.id==='lock-culvert')(g.campaign!.expedition??={}).culvert=true;g.position={...p.spawn};g.direction=sharedOutdoors(from,p.to)?direction:p.direction;return true;}
