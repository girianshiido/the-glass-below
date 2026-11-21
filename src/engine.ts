import {regionOf,regionWall,regionSight,nearbyPassage,passageLocked,passageHint,regionEncounter,revealRegion} from './region-world.ts';
import {activeHero,campaignVictory,updateRoadRespawns,CAMPAIGN_ENCOUNTERS,crossPassage} from './campaign.ts';
import type {Campaign} from './campaign.ts';
import {ENCOUNTERS,START,CHEST,GATE,SHRINE,EXIT,DIRECTIONS,wall,same,reveal,lineOfSight} from './world.ts';
import type {Point,CreatureKind,EncounterDef} from './world.ts';
export type Phase='explore'|'combat'|'victory'|'defeat'|'complete';
export type Skill='fracture'|'frost'|'heal';
export interface Hero {name:string;hp:number;maxHp:number;mp:number;maxMp:number;clock:number;attack:number}
export interface Enemy {id:number;kind:CreatureKind;name:string;hp:number;maxHp:number;clock:number;windup:number;hurtAt:number;strikeAt:number;deathAt:number;stunned:number;frozen:boolean;target:number}
export interface Battle {encounter:string;enemies:Enemy[];target:number;time:number;paused:boolean;speed:number;queue:Skill[];cooldowns:Record<Skill,number>;shield:number;globalCooldown:number}
export interface Feedback {id:number;kind:'hit'|'hurt'|'heal'|'ice'|'break'|'guard';text:string;enemy?:number;hero?:number;time:number}
export interface Game {campaign?:Campaign;phase:Phase;position:Point;direction:number;heroes:Hero[];battle:Battle|null;cleared:Set<string>;roaming:Set<string>;respawnAt:Record<string,number>;seen:Set<string>;key:boolean;gateOpen:boolean;chestOpen:boolean;shrineUsed:boolean;gold:number;message:string;feedback:Feedback[];eventId:number;playTime:number}
export const CREATURES:Record<CreatureKind,{name:string;hp:number;attack:number;period:number;windup:number;skill:string;tip:string;row:number}>={
  scavenger:{name:'Glass Scavenger',hp:115,attack:12,period:3.6,windup:1.5,skill:'Crystal Bite',tip:'Fracture breaks its crystalline shell.',row:0},
  wraith:{name:'Lantern Watcher',hp:150,attack:22,period:4.8,windup:2.4,skill:'Devouring Light',tip:'Interrupt its spell with Frost Shard.',row:1},
  sentinel:{name:'The Faceless Warden',hp:580,attack:36,period:5.2,windup:2.8,skill:'Warden’s Judgment',tip:'Its heavy strikes threaten the entire party. Save Frost Shard to interrupt them.',row:2},
};
export const SKILLS:Record<Skill,{name:string;cost:number;cooldown:number;hero:number;description:string}>={
  fracture:{name:'Fracture',cost:5,cooldown:5,hero:0,description:'Deals 38 damage and interrupts the target.'},
  frost:{name:'Frost Shard',cost:7,cooldown:7,hero:1,description:'Deals 30 damage. Interrupts and freezes the target for 2 seconds.'},
  heal:{name:'Mending Seal',cost:9,cooldown:10,hero:1,description:'Restores 58 HP to the most wounded ally.'},
};
export function createGame():Game{
  const g:Game={phase:'explore',position:{...START},direction:0,heroes:[
    {name:'Kael',hp:180,maxHp:180,mp:32,maxMp:32,clock:0,attack:12},
    {name:'Lys',hp:140,maxHp:140,mp:44,maxMp:44,clock:.3,attack:9},
  ],battle:null,cleared:new Set(),roaming:new Set(),respawnAt:{},seen:new Set(),key:false,gateOpen:false,chestOpen:false,shrineUsed:false,gold:0,message:'',feedback:[],eventId:0,playTime:0};
  reveal(g.seen,g.position,false);return g;
}
function emit(g:Game,kind:Feedback['kind'],text:string,enemy?:number,hero?:number){g.feedback.push({id:++g.eventId,kind,text,enemy,hero,time:g.battle?.time??0});if(g.feedback.length>25)g.feedback.shift();}
export const PATROL_SITES=['first','pair','passage'] as const;
export const RESPAWN_DELAY=20;
export function encounterActive(g:Game,id:string){return !g.cleared.has(id)||g.roaming.has(id);}
export function updateRespawns(g:Game){
 if(g.phase!=='explore')return;updateRoadRespawns(g);if(PATROL_SITES.some(id=>g.roaming.has(id)))return;
 for(const id of PATROL_SITES){
  if(!g.cleared.has(id))continue;
  const e=ENCOUNTERS.find(e=>e.id===id)!;
  const outside=!!g.campaign&&g.campaign.zone!=='crypts';
  if(!outside&&(Math.hypot(e.x-g.position.x,e.y-g.position.y)<3||(g.campaign?regionSight('crypts',g.position,e,g.gateOpen):lineOfSight(g.position,e,g.gateOpen)))){g.respawnAt[id]=g.playTime+RESPAWN_DELAY;continue;}
  g.respawnAt[id]??=g.playTime+RESPAWN_DELAY;if(g.playTime<g.respawnAt[id])continue;
  g.roaming.add(id);g.message='Distant footsteps echo through the crypts.';break;
 }
}
export function beginBattle(g:Game,encounter:EncounterDef){
  if(g.phase!=='explore'||!encounterActive(g,encounter.id))return false;
  const d=CREATURES[encounter.kind];
  g.battle={encounter:encounter.id,enemies:[{id:0,kind:encounter.kind,name:d.name,hp:d.hp,maxHp:d.hp,clock:0,windup:0,hurtAt:-100,strikeAt:-100,deathAt:-100,stunned:0,frozen:false,target:0}],target:0,time:0,paused:false,speed:1,queue:[],cooldowns:{fracture:0,frost:0,heal:0},shield:0,globalCooldown:0};
  g.heroes.forEach(h=>h.clock=0);g.feedback=[];g.phase='combat';g.message=d.tip;return true;
}
export function encounterAhead(g:Game){
  const [dx,dy]=DIRECTIONS[g.direction];
  return (g.campaign?regionOf(g).encounters:ENCOUNTERS).find(e=>encounterActive(g,e.id)&&e.x===g.position.x+dx&&e.y===g.position.y+dy&&(g.campaign?regionSight(g.campaign.zone,g.position,e,g.gateOpen):lineOfSight(g.position,e,g.gateOpen)));
}
export function move(g:Game,relative:number){
  if(g.phase!=='explore')return false;
  const direction=(g.direction+relative+4)%4,[dx,dy]=DIRECTIONS[direction];
  const next={x:g.position.x+dx,y:g.position.y+dy};
  if(g.campaign?regionWall(g.campaign.zone,next.x,next.y):wall(next.x,next.y)){g.message='The way is blocked.';return false;}
  if(g.campaign){const p=regionOf(g).passages.find(p=>same(p,next));if(p){if(passageLocked(g,p)){g.message=passageHint(g,p);return false;}if(crossPassage(g))return true;}if(regionOf(g).residents.some(n=>same(n,next)&&!(n.id==='lys'&&g.campaign!.recruited))){g.message='Interact to speak.';return false;}}
  if((!g.campaign||g.campaign.zone==='crypts')&&same(next,GATE)&&!g.gateOpen){g.message=g.key?'The gate is locked. Interact to use the key.':'A copper key is needed.';return false;}
  const encounter=(g.campaign?regionOf(g).encounters:ENCOUNTERS).find(e=>encounterActive(g,e.id)&&same(e,next));
  if(encounter){g.direction=direction;beginBattle(g,encounter);return false;}
  g.position=next;if(g.campaign)revealRegion(g);else reveal(g.seen,next,g.gateOpen);g.message=locationHint(g);
  if(!g.campaign&&same(next,EXIT)&&g.cleared.has('guardian')){g.phase=g.campaign?'explore':'complete';g.message='Silence returns to the Glass Crypts.';return true;}
  const ahead=encounterAhead(g);if(ahead)beginBattle(g,ahead);
  return true;
}
export function turn(g:Game,delta:number){if(g.phase!=='explore')return;g.direction=(g.direction+delta+4)%4;if(g.campaign)revealRegion(g);else reveal(g.seen,g.position,g.gateOpen);g.message=locationHint(g);const e=encounterAhead(g);if(e)beginBattle(g,e);}
export function locationHint(g:Game){
  if(g.campaign){const p=nearbyPassage(g);if(p)return passageHint(g,p);if(g.campaign.zone!=='crypts')return'';}
  if(same(g.position,CHEST)&&!g.chestOpen)return'Interact to open the chest.';
  if(same(g.position,SHRINE)&&!g.shrineUsed)return'Interact to restore your party at the spring.';
  if(!g.gateOpen&&Math.abs(g.position.x-GATE.x)+Math.abs(g.position.y-GATE.y)===1)return g.key?'Interact to unlock the gate.':'The gate is locked.';
  return'';
}
export function interact(g:Game){
  if(g.phase!=='explore')return;
  if(g.campaign){const p=nearbyPassage(g);if(p){if(p.id==='pine-gate'&&g.campaign.stage>=1&&!g.campaign.villageGateOpen){g.campaign.villageGateOpen=true;g.campaign.gateOpenedAt=g.playTime;g.message='The pine gate opens. Walk through to leave Greyhaven.';return;}if(passageLocked(g,p)){g.message=passageHint(g,p);return;}crossPassage(g);return;}if(g.campaign.zone!=='crypts')return;}
  if(same(g.position,CHEST)&&!g.chestOpen){g.chestOpen=true;g.key=true;g.gold+=30;g.message='Copper key found · +30 shards';return;}
  if(same(g.position,SHRINE)&&!g.shrineUsed){g.shrineUsed=true;for(const h of g.heroes){h.hp=h.maxHp;h.mp=h.maxMp;}g.message='The spring restores all HP and MP.';return;}
  if(!g.gateOpen&&Math.abs(g.position.x-GATE.x)+Math.abs(g.position.y-GATE.y)===1){if(g.key){g.gateOpen=true;reveal(g.seen,g.position,true);g.message='The gate opens.';}else g.message='You need the copper key.';return;}
  g.message=locationHint(g);
}
/** Every encounter has one opponent. */
export function visibleEnemy(b:Battle){return b.enemies[0];}
export function livingTarget(g:Game){const b=g.battle;if(!b)return undefined;const e=visibleEnemy(b);return e?.hp>0?e:undefined;}
export function selectTarget(g:Game,id:number){const e=livingTarget(g);if(g.phase==='combat'&&e?.id===id)g.battle!.target=id;}
function damage(g:Game,e:Enemy,value:number,kind:Feedback['kind']='hit'){
  if(e.hp<=0)return;e.hp=Math.max(0,e.hp-value);e.hurtAt=g.battle!.time;emit(g,kind,`−${value}`,e.id);if(e.hp===0)e.deathAt=g.battle!.time;
}
export function skillPower(g:Game,skill:Skill){const level=g.campaign?.level??1;return skill==='fracture'?38+(level-1)*6:skill==='frost'?30+(level-1)*5+(g.campaign?.charm?8:0):58+(level-1)*8;}
export function canUse(g:Game,skill:Skill,checkGlobal=true){const b=g.battle,d=SKILLS[skill];return g.phase==='combat'&&!!b&&activeHero(g,d.hero)&&g.heroes[d.hero].hp>0&&g.heroes[d.hero].mp>=d.cost&&b.cooldowns[skill]<=0&&(!checkGlobal||b.globalCooldown<=0)&&!!livingTarget(g);}
function execute(g:Game,skill:Skill){
  if(!canUse(g,skill))return false;const b=g.battle!,d=SKILLS[skill],hero=g.heroes[d.hero],enemy=livingTarget(g)!;
  hero.mp-=d.cost;b.cooldowns[skill]=d.cooldown;b.globalCooldown=.65;
  if(skill==='heal'){
    const h=g.heroes.filter(h=>h.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    const amount=Math.min(skillPower(g,'heal'),h.maxHp-h.hp);h.hp+=amount;emit(g,'heal',`+${amount}`,undefined,g.heroes.indexOf(h));
  }else{
    const interrupted=enemy.windup>0;enemy.windup=0;enemy.clock=0;
    if(skill==='frost'){enemy.frozen=true;enemy.stunned=2;damage(g,enemy,skillPower(g,'frost'),'ice');}
    else{enemy.frozen=false;enemy.stunned=Math.max(enemy.stunned,.6);damage(g,enemy,skillPower(g,'fracture'),'break');}
    g.message=interrupted?'Attack interrupted!':`${d.name} hits its target.`;
  }
  resolve(g);return true;
}
export function useSkill(g:Game,skill:Skill){
  const b=g.battle;if(!b||g.phase!=='combat')return false;
  if(b.paused){
    if(b.queue.includes(skill)){b.queue=b.queue.filter(s=>s!==skill);return true;}
    if(!canUse(g,skill,false))return false;
    const owner=SKILLS[skill].hero;
    b.queue=b.queue.filter(s=>SKILLS[s].hero!==owner);b.queue.push(skill);g.message='Action queued.';return true;
  }
  return execute(g,skill);
}
export function togglePause(g:Game){if(g.phase==='combat'&&g.battle){g.battle.paused=!g.battle.paused;g.message='';}}
function resolve(g:Game){
  const b=g.battle!;
  if(b.enemies.every(e=>e.hp<=0)){
    const returning=g.roaming.delete(b.encounter);
    if(PATROL_SITES.some(id=>id===b.encounter))g.respawnAt[b.encounter]=g.playTime+RESPAWN_DELAY;
    g.cleared.add(b.encounter);g.phase='victory';b.paused=false;b.queue=[];
    const boss=b.encounter==='guardian';g.gold+=boss?100:returning?10:20;
    for(const h of g.heroes){h.hp=Math.min(h.maxHp,Math.max(h.hp,1)+(returning?6:18));h.mp=Math.min(h.maxMp,h.mp+(returning?4:10));}
    const advancement=campaignVictory(g,b.encounter,returning);
    g.message=(boss?(g.campaign?'The memory prism is yours. Greyhaven is waiting.':'The Warden has fallen. The exit lies ahead.'):returning?'Patrol defeated · +10 shards, +6 HP and +4 MP each':'Passage cleared · +18 HP and +10 MP each')+(advancement?' · '+advancement:'');
  }else if(g.heroes.every((h,i)=>!activeHero(g,i)||h.hp<=0)){g.phase='defeat';b.paused=false;b.queue=[];g.message='Your expedition ends here. Return to the last saved checkpoint.';}
  else b.target=visibleEnemy(b).id;
}
export function tick(g:Game,dt:number){
  if(!Number.isFinite(dt)||dt<=0)return;
  if(g.phase==='explore'){g.playTime+=Math.min(dt,.1);updateRespawns(g);return;}
  const b=g.battle;if(g.phase!=='combat'||!b||b.paused)return;
  const elapsed=Math.min(dt,.1)*b.speed;
  // Fixed micro-steps prevent attack/interrupt races at accelerated speed.
  for(let remaining=elapsed;remaining>1e-8&&g.phase==='combat';){
    const step=Math.min(remaining,1/60);remaining-=step;b.time+=step;g.playTime+=step;
    b.globalCooldown=Math.max(0,b.globalCooldown-step);
    for(const skill of Object.keys(SKILLS)as Skill[])b.cooldowns[skill]=Math.max(0,b.cooldowns[skill]-step);
    if(b.queue.length&&b.globalCooldown<=0){const skill=b.queue.shift()!;execute(g,skill);if(g.phase!=='combat')break;}
    for(const h of g.heroes){
      if(h.hp<=0||!activeHero(g,g.heroes.indexOf(h)))continue;h.mp=Math.min(h.maxMp,h.mp+step*.25);h.clock+=step;
      if(h.clock>=2.2){h.clock-=2.2;const e=livingTarget(g);if(e)damage(g,e,h.attack);resolve(g);if(g.phase!=='combat')break;}
    }
    if(g.phase!=='combat')break;
    for(const e of [visibleEnemy(b)]){
      if(e.hp<=0)continue;
      if(e.stunned>0){e.stunned=Math.max(0,e.stunned-step);continue;}
      const d=CREATURES[e.kind];
      if(e.windup>0){
        e.windup=Math.max(0,e.windup-step);
        if(e.windup===0){
          e.strikeAt=b.time;const living=g.heroes.map((h,i)=>({h,i})).filter(({h,i})=>h.hp>0&&activeHero(g,i));
          const targets=e.kind==='sentinel'?living:[living.find(({i})=>i===e.target)??living[0]];
          for(const {h,i}of targets){const amount=Math.max(1,d.attack-(g.campaign?.armor==='warden'?3:0));h.hp=Math.max(0,h.hp-amount);emit(g,'hurt',`−${amount}`,undefined,i);}
          e.target=g.campaign&&!g.campaign.recruited?0:(e.target+1)%2;e.clock=0;resolve(g);if(g.phase!=='combat')break;
        }
      }else{e.clock+=step;if(e.clock>=d.period){e.windup=d.windup;e.clock=0;}}
    }
  }
}
export function continueAfterBattle(g:Game){if(g.phase!=='victory')return;g.phase='explore';g.battle=null;g.feedback=[];g.message=locationHint(g);}
export function retreat(g:Game){if(g.phase!=='combat')return;g.phase='explore';g.battle=null;g.feedback=[];g.position=g.campaign?{...regionOf(g).spawn}:{...START};g.direction=g.campaign?regionOf(g).direction:0;g.message='Back at the entrance. Undefeated enemies have recovered.';}

export function encounterDefinition(id:string){return regionEncounter(id)??[...ENCOUNTERS,...CAMPAIGN_ENCOUNTERS].find(e=>e.id===id);}
