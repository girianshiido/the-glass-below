import type {Game} from './engine.ts';
import type {EncounterDef} from './world.ts';
export type Zone='village'|'road'|'glassworks'|'crypts';
export interface Campaign {zone:Zone;stage:number;recruited:boolean;level:number;xp:number;potions:number;weapon:'iron'|'tempered';armor:'travel'|'warden';charm:boolean;introRead:boolean;roadCleared:string[];roadAwayAt:Record<string,number>;visited:Zone[]}
export const ROAD_ENCOUNTERS:EncounterDef[]=[{id:'road-shards',kind:'scavenger',x:3,y:1},{id:'road-hollow',kind:'scavenger',x:5,y:1},{id:'road-lantern',kind:'wraith',x:7,y:1}];
export const FURNACE:EncounterDef={id:'furnace',kind:'wraith',x:2,y:1};
export const CAMPAIGN_ENCOUNTERS=[...ROAD_ENCOUNTERS,FURNACE];
export function setupCampaign(g:Game){g.campaign={zone:'village',stage:0,recruited:false,level:1,xp:0,potions:3,weapon:'iron',armor:'travel',charm:false,introRead:false,roadCleared:[],roadAwayAt:{},visited:['village']};g.gold=20;refreshStats(g);return g;}
export function activeHero(g:Game,index:number){return !g.campaign||index===0||g.campaign.recruited;}
export function xpNeeded(level:number){return 50+(level-1)*35;}
export function refreshStats(g:Game){const c=g.campaign;if(!c)return;g.heroes.forEach((h,i)=>{h.maxHp=(i===0?180:140)+(c.level-1)*(i===0?18:14)+(c.armor==='warden'?20:0);h.maxMp=(i===0?32:44)+(c.level-1)*4;h.attack=(i===0?16:10)+(c.level-1)*3+(c.weapon==='tempered'?5:0);h.hp=Math.min(h.hp,h.maxHp);h.mp=Math.min(h.mp,h.maxMp);});}
export function grantXp(g:Game,amount:number){const c=g.campaign;if(!c)return false;c.xp+=amount;let leveled=false;while(c.level<20&&c.xp>=xpNeeded(c.level)){c.xp-=xpNeeded(c.level);c.level++;leveled=true;}refreshStats(g);if(leveled)g.heroes.forEach((h,i)=>{if(activeHero(g,i)){h.hp=h.maxHp;h.mp=h.maxMp;}});return leveled;}
export function campaignVictory(g:Game,id:string,returning:boolean){const c=g.campaign;if(!c)return'';
 let note=grantXp(g,returning?12:id==='guardian'?120:id==='furnace'?80:55)?`Level ${c.level} reached · HP and MP restored`:`+${returning?12:id==='guardian'?120:id==='furnace'?80:55} XP`;
 if(id.startsWith('road-')){if(!c.roadCleared.includes(id))c.roadCleared.push(id);if(c.roadCleared.length===3&&c.stage===1){c.stage=2;note+=' · An empty courier’s satchel lies beside the lantern. Return to Elder Elara.';}}
 if(id==='furnace'&&c.stage===3){c.stage=4;note+=' · The furnace falls silent. Speak to Lys.';}
 if(id==='guardian'){c.stage=6;note+=' · Return to Greyhaven with the memory prism.';}
 return note;
}
export function campaignObjective(g:Game){const c=g.campaign;if(!c)return'';return ['Speak to Elder Elara in Greyhaven','Clear the three threats on the Old Pine Road','Return to Elder Elara','Investigate the abandoned glassworks','Speak to Lys at the glassworks','Find the memory prism beneath the glassworks','Return to Elder Elara with the prism','Chapter complete · Explore or start a new journey'][c.stage]??'';}
export function travel(g:Game,zone:Zone){const c=g.campaign;if(!c||g.phase!=='explore')return false;if(zone==='road'&&c.stage<1||zone==='glassworks'&&c.stage<3||zone==='crypts'&&!c.recruited)return false;
 const from=c.zone;if(from==='road'&&zone!=='road')for(const e of ROAD_ENCOUNTERS)if(g.cleared.has(e.id)&&!g.roaming.has(e.id)&&c.roadAwayAt[e.id]===undefined)c.roadAwayAt[e.id]=g.playTime;
 c.zone=zone;if(!c.visited.includes(zone))c.visited.push(zone);g.position={x:1,y:1};g.direction=0;g.message='';return true;}
export function updateRoadRespawns(g:Game){const c=g.campaign;if(!c)return;for(const e of ROAD_ENCOUNTERS){if(!g.cleared.has(e.id)||g.roaming.has(e.id))continue;const visible=c.zone==='road'&&(g.direction===0?e.x>=g.position.x:g.direction===2?e.x<=g.position.x:Math.abs(g.position.x-e.x)<=1);const away=c.zone!=='road'||Math.abs(g.position.x-e.x)>2&&!visible;if(!away){delete c.roadAwayAt[e.id];continue;}c.roadAwayAt[e.id]??=g.playTime;if(g.playTime-c.roadAwayAt[e.id]>=20&&!ROAD_ENCOUNTERS.some(site=>g.roaming.has(site.id))){g.roaming.add(e.id);delete c.roadAwayAt[e.id];}}}
export function campaignAction(g:Game,action:string){const c=g.campaign;if(!c||g.phase!=='explore'&&!(action==='potion'&&g.phase==='combat'))return false;
 if(action==='accept'&&c.stage===0){c.stage=1;return true;}
 if(action==='report'&&c.stage===2){c.stage=3;g.gold+=35;grantXp(g,30);g.message='Road commission complete · +35 shards · +30 XP';return true;}
 if(action==='recruit'&&c.stage===4){c.recruited=true;c.stage=5;refreshStats(g);g.heroes[1].hp=g.heroes[1].maxHp;g.heroes[1].mp=g.heroes[1].maxMp;return true;}
 if(action==='ending'&&c.stage===6){c.stage=7;g.gold+=100;grantXp(g,100);return true;}
 if(action==='rest'&&c.zone==='village'&&g.gold>=5){g.gold-=5;g.heroes.forEach(h=>{h.hp=h.maxHp;h.mp=h.maxMp;});return true;}
 if(action==='potion'&&c.potions>0){const hero=g.heroes.filter((_,i)=>activeHero(g,i)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(hero.hp>=hero.maxHp)return false;c.potions--;hero.hp=Math.min(hero.maxHp,hero.hp+80);return true;}
 if(action==='buy-potion'&&c.zone==='village'&&g.gold>=12&&c.potions<9){g.gold-=12;c.potions++;return true;}
 if(action==='buy-weapon'&&c.zone==='village'&&g.gold>=45&&c.weapon==='iron'){g.gold-=45;c.weapon='tempered';refreshStats(g);return true;}
 if(action==='buy-armor'&&c.zone==='village'&&g.gold>=40&&c.armor==='travel'){g.gold-=40;c.armor='warden';refreshStats(g);return true;}
 if(action==='buy-charm'&&c.zone==='village'&&g.gold>=30&&!c.charm){g.gold-=30;c.charm=true;return true;}
 return false;
}
export function roadMove(g:Game,relative:number){const c=g.campaign;if(!c||c.zone!=='road'||g.phase!=='explore')return null;const d=(g.direction+relative+4)%4;if(d!==0&&d!==2)return false;const x=g.position.x+(d===0?1:-1);if(x<1||x>9)return false;const e=ROAD_ENCOUNTERS.find(e=>e.x===x&&(!g.cleared.has(e.id)||g.roaming.has(e.id)));return e??{x,y:1};}
