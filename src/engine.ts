import {ENCOUNTERS,START,CHEST,GATE,SHRINE,EXIT,DIRECTIONS,wall,same,reveal,lineOfSight} from './world.ts';
import type {Point,CreatureKind,EncounterDef} from './world.ts';
export type Phase='explore'|'combat'|'victory'|'defeat'|'complete';
export type Skill='fracture'|'frost'|'heal';
export interface Hero {name:string;hp:number;maxHp:number;mp:number;maxMp:number;clock:number;attack:number}
export interface Enemy {id:number;kind:CreatureKind;name:string;hp:number;maxHp:number;clock:number;windup:number;hurtAt:number;strikeAt:number;deathAt:number;stunned:number;target:number}
export interface Battle {encounter:string;enemies:Enemy[];target:number;time:number;paused:boolean;speed:number;queue:Skill[];cooldowns:Record<Skill,number>;shield:number;globalCooldown:number}
export interface Feedback {id:number;kind:'hit'|'hurt'|'heal'|'ice'|'break'|'guard';text:string;enemy?:number;hero?:number;time:number}
export interface Game {phase:Phase;position:Point;direction:number;heroes:Hero[];battle:Battle|null;cleared:Set<string>;seen:Set<string>;key:boolean;gateOpen:boolean;chestOpen:boolean;shrineUsed:boolean;gold:number;message:string;feedback:Feedback[];eventId:number;playTime:number}
export const CREATURES:Record<CreatureKind,{name:string;hp:number;attack:number;period:number;windup:number;skill:string;tip:string;row:number}>={
  scavenger:{name:'Rôdeur de verre',hp:115,attack:12,period:3.6,windup:1.5,skill:'Morsure cristalline',tip:'Sa carapace cède sous Fracture.',row:0},
  wraith:{name:'Veilleur des lanternes',hp:150,attack:22,period:4.8,windup:2.4,skill:'Lueur dévorante',tip:'Interrompez son incantation avec Éclat de givre.',row:1},
  sentinel:{name:'Le Gardien sans visage',hp:580,attack:36,period:5.2,windup:2.8,skill:'Sentence du sanctuaire',tip:'Ses frappes lourdes menacent les deux aventuriers. Gardez le givre pour les interrompre.',row:2},
};
export const SKILLS:Record<Skill,{name:string;cost:number;cooldown:number;hero:number;description:string}>={
  fracture:{name:'Fracture',cost:5,cooldown:5,hero:0,description:'38 dégâts. Interrompt la préparation de la cible.'},
  frost:{name:'Éclat de givre',cost:7,cooldown:7,hero:1,description:'30 dégâts. Interrompt et fige la cible pendant 2 secondes.'},
  heal:{name:'Sceau de soin',cost:9,cooldown:10,hero:1,description:'Rend 58 PV à l’allié le plus blessé.'},
};
export function createGame():Game{
  const g:Game={phase:'explore',position:{...START},direction:0,heroes:[
    {name:'Kaël',hp:180,maxHp:180,mp:32,maxMp:32,clock:0,attack:12},
    {name:'Lys',hp:140,maxHp:140,mp:44,maxMp:44,clock:.3,attack:9},
  ],battle:null,cleared:new Set(),seen:new Set(),key:false,gateOpen:false,chestOpen:false,shrineUsed:false,gold:0,message:'Retrouvez la clé de cuivre et atteignez le sanctuaire.',feedback:[],eventId:0,playTime:0};
  reveal(g.seen,g.position,false);return g;
}
function emit(g:Game,kind:Feedback['kind'],text:string,enemy?:number,hero?:number){g.feedback.push({id:++g.eventId,kind,text,enemy,hero,time:g.battle?.time??0});if(g.feedback.length>25)g.feedback.shift();}
export function beginBattle(g:Game,encounter:EncounterDef){
  if(g.phase!=='explore'||g.cleared.has(encounter.id))return false;
  const d=CREATURES[encounter.kind];
  g.battle={encounter:encounter.id,enemies:Array.from({length:encounter.count},(_,i)=>({id:i,kind:encounter.kind,name:d.name,hp:d.hp,maxHp:d.hp,clock:i*.65,windup:0,hurtAt:-100,strikeAt:-100,deathAt:-100,stunned:0,target:i%2})),target:0,time:0,paused:false,speed:1,queue:[],cooldowns:{fracture:0,frost:0,heal:0},shield:0,globalCooldown:0};
  g.heroes.forEach(h=>h.clock=0);g.feedback=[];g.phase='combat';g.message=d.tip;return true;
}
export function encounterAhead(g:Game){
  const [dx,dy]=DIRECTIONS[g.direction];
  return ENCOUNTERS.find(e=>!g.cleared.has(e.id)&&e.x===g.position.x+dx&&e.y===g.position.y+dy&&lineOfSight(g.position,e,g.gateOpen));
}
export function move(g:Game,relative:number){
  if(g.phase!=='explore')return false;
  const direction=(g.direction+relative+4)%4,[dx,dy]=DIRECTIONS[direction];
  const next={x:g.position.x+dx,y:g.position.y+dy};
  if(wall(next.x,next.y)){g.message='La pierre vous barre le passage.';return false;}
  if(same(next,GATE)&&!g.gateOpen){g.message=g.key?'La grille est verrouillée. Utilisez Interagir pour employer la clé.':'La grille exige une clé de cuivre.';return false;}
  const encounter=ENCOUNTERS.find(e=>!g.cleared.has(e.id)&&same(e,next));
  if(encounter){g.direction=direction;beginBattle(g,encounter);return false;}
  g.position=next;reveal(g.seen,next,g.gateOpen);g.message=locationHint(g);
  if(same(next,EXIT)&&g.cleared.has('guardian')){g.phase='complete';g.message='Le silence revient dans les Cryptes de Verre.';return true;}
  const ahead=encounterAhead(g);if(ahead)beginBattle(g,ahead);
  return true;
}
export function turn(g:Game,delta:number){if(g.phase!=='explore')return;g.direction=(g.direction+delta+4)%4;reveal(g.seen,g.position,g.gateOpen);g.message=locationHint(g);const e=encounterAhead(g);if(e)beginBattle(g,e);}
export function locationHint(g:Game){
  if(same(g.position,CHEST)&&!g.chestOpen)return'Un coffre de cuivre. Utilisez Interagir pour l’ouvrir.';
  if(same(g.position,SHRINE)&&!g.shrineUsed)return'Une source intacte. Interagissez pour restaurer votre groupe.';
  if(!g.gateOpen&&Math.abs(g.position.x-GATE.x)+Math.abs(g.position.y-GATE.y)===1)return g.key?'La clé de cuivre ouvre cette grille.':'Une grille verrouillée protège le sanctuaire.';
  return g.key?'Rejoignez la grille, à l’est des cryptes.':'Cherchez la clé de cuivre dans les cryptes.';
}
export function interact(g:Game){
  if(g.phase!=='explore')return;
  if(same(g.position,CHEST)&&!g.chestOpen){g.chestOpen=true;g.key=true;g.gold+=30;g.message='Clé de cuivre obtenue · 30 éclats retrouvés.';return;}
  if(same(g.position,SHRINE)&&!g.shrineUsed){g.shrineUsed=true;for(const h of g.heroes){h.hp=h.maxHp;h.mp=h.maxMp;}g.message='La source restaure tous vos PV et PM.';return;}
  if(!g.gateOpen&&Math.abs(g.position.x-GATE.x)+Math.abs(g.position.y-GATE.y)===1){if(g.key){g.gateOpen=true;reveal(g.seen,g.position,true);g.message='La grille s’ouvre. Le Gardien vous attend.';}else g.message='Il vous manque la clé de cuivre.';return;}
  g.message=locationHint(g);
}
export function livingTarget(g:Game){const b=g.battle;if(!b)return undefined;return b.enemies.find(e=>e.id===b.target&&e.hp>0)??b.enemies.find(e=>e.hp>0);}
export function selectTarget(g:Game,id:number){if(g.phase==='combat'&&g.battle?.enemies.some(e=>e.id===id&&e.hp>0))g.battle.target=id;}
function damage(g:Game,e:Enemy,value:number,kind:Feedback['kind']='hit'){
  if(e.hp<=0)return;e.hp=Math.max(0,e.hp-value);e.hurtAt=g.battle!.time;emit(g,kind,`−${value}`,e.id);if(e.hp===0)e.deathAt=g.battle!.time;
}
export function canUse(g:Game,skill:Skill,checkGlobal=true){const b=g.battle,d=SKILLS[skill];return g.phase==='combat'&&!!b&&g.heroes[d.hero].hp>0&&g.heroes[d.hero].mp>=d.cost&&b.cooldowns[skill]<=0&&(!checkGlobal||b.globalCooldown<=0)&&!!livingTarget(g);}
function execute(g:Game,skill:Skill){
  if(!canUse(g,skill))return false;const b=g.battle!,d=SKILLS[skill],hero=g.heroes[d.hero],enemy=livingTarget(g)!;
  hero.mp-=d.cost;b.cooldowns[skill]=d.cooldown;b.globalCooldown=.65;
  if(skill==='heal'){
    const h=g.heroes.filter(h=>h.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    const amount=Math.min(58,h.maxHp-h.hp);h.hp+=amount;emit(g,'heal',`+${amount}`,undefined,g.heroes.indexOf(h));
  }else{
    const interrupted=enemy.windup>0;enemy.windup=0;enemy.clock=0;
    if(skill==='frost'){enemy.stunned=2;damage(g,enemy,30,'ice');}
    else{enemy.stunned=Math.max(enemy.stunned,.6);damage(g,enemy,38,'break');}
    g.message=interrupted?'Préparation interrompue !':`${d.name} atteint sa cible.`;
  }
  resolve(g);return true;
}
export function useSkill(g:Game,skill:Skill){
  const b=g.battle;if(!b||g.phase!=='combat')return false;
  if(b.paused){
    if(b.queue.includes(skill)){b.queue=b.queue.filter(s=>s!==skill);return true;}
    if(!canUse(g,skill,false))return false;
    const owner=SKILLS[skill].hero;
    b.queue=b.queue.filter(s=>SKILLS[s].hero!==owner);b.queue.push(skill);g.message='Ordre préparé. Il sera exécuté à la reprise.';return true;
  }
  return execute(g,skill);
}
export function togglePause(g:Game){if(g.phase==='combat'&&g.battle){g.battle.paused=!g.battle.paused;g.message=g.battle.paused?'Temps suspendu. Choisissez une cible et préparez vos compétences.':'Le combat reprend.';}}
function resolve(g:Game){
  const b=g.battle!;
  if(b.enemies.every(e=>e.hp<=0)){
    g.cleared.add(b.encounter);g.phase='victory';b.paused=false;b.queue=[];
    const boss=b.encounter==='guardian';g.gold+=boss?100:20;
    for(const h of g.heroes){h.hp=Math.min(h.maxHp,Math.max(h.hp,1)+18);h.mp=Math.min(h.maxMp,h.mp+10);}
    g.message=boss?'Le Gardien est tombé. La sortie vous attend au bout du passage.':'Passage libéré. +18 PV et +10 PM pour chaque aventurier.';
  }else if(g.heroes.every(h=>h.hp<=0)){g.phase='defeat';b.paused=false;b.queue=[];g.message='Votre expédition s’achève ici. Reprenez depuis l’entrée des cryptes.';}
  else b.target=livingTarget(g)!.id;
}
export function tick(g:Game,dt:number){
  if(!Number.isFinite(dt)||dt<=0)return;
  if(g.phase==='explore'){g.playTime+=Math.min(dt,.1);return;}
  const b=g.battle;if(g.phase!=='combat'||!b||b.paused)return;
  const elapsed=Math.min(dt,.1)*b.speed;
  // Fixed micro-steps prevent attack/interrupt races at accelerated speed.
  for(let remaining=elapsed;remaining>1e-8&&g.phase==='combat';){
    const step=Math.min(remaining,1/60);remaining-=step;b.time+=step;g.playTime+=step;
    b.globalCooldown=Math.max(0,b.globalCooldown-step);
    for(const skill of Object.keys(SKILLS)as Skill[])b.cooldowns[skill]=Math.max(0,b.cooldowns[skill]-step);
    if(b.queue.length&&b.globalCooldown<=0){const skill=b.queue.shift()!;execute(g,skill);if(g.phase!=='combat')break;}
    for(const h of g.heroes){
      if(h.hp<=0)continue;h.mp=Math.min(h.maxMp,h.mp+step*.25);h.clock+=step;
      if(h.clock>=2.2){h.clock-=2.2;const e=livingTarget(g);if(e)damage(g,e,h.attack);resolve(g);if(g.phase!=='combat')break;}
    }
    if(g.phase!=='combat')break;
    for(const e of b.enemies){
      if(e.hp<=0)continue;
      if(e.stunned>0){e.stunned=Math.max(0,e.stunned-step);continue;}
      const d=CREATURES[e.kind];
      if(e.windup>0){
        e.windup=Math.max(0,e.windup-step);
        if(e.windup===0){
          e.strikeAt=b.time;const living=g.heroes.map((h,i)=>({h,i})).filter(({h})=>h.hp>0);
          const targets=e.kind==='sentinel'?living:[living.find(({i})=>i===e.target)??living[0]];
          for(const {h,i}of targets){h.hp=Math.max(0,h.hp-d.attack);emit(g,'hurt',`−${d.attack}`,undefined,i);}
          e.target=(e.target+1)%2;e.clock=0;resolve(g);if(g.phase!=='combat')break;
        }
      }else{e.clock+=step;if(e.clock>=d.period){e.windup=d.windup;e.clock=0;}}
    }
  }
}
export function continueAfterBattle(g:Game){if(g.phase!=='victory')return;g.phase='explore';g.battle=null;g.feedback=[];g.message=locationHint(g);}
export function retreat(g:Game){if(g.phase!=='combat')return;g.phase='explore';g.battle=null;g.feedback=[];g.position={...START};g.direction=0;g.message='Repli à l’entrée. Les ennemis non vaincus ont retrouvé leurs forces.';}
