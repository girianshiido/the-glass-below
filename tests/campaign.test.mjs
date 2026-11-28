import {EXPEDITION_FIXTURES} from '../src/expedition-world.ts';
import {ENCOUNTERS} from '../src/world.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createGame,beginBattle,useSkill,tick,continueAfterBattle,canUse,updateRespawns,skillPower} from '../src/engine.ts';
import {setupCampaign,campaignAction,travel,ROAD_ENCOUNTERS,FURNACE,grantXp,roadMove,refreshStats,CAMPAIGN_ENCOUNTERS} from '../src/campaign.ts';
import {serialize,deserialize} from '../src/save.ts';
import {musicScene} from '../src/audio-state.ts';
const fresh=()=>setupCampaign(createGame());
function win(g,e){assert(beginBattle(g,e));g.battle.enemies[0].hp=1;assert(useSkill(g,'fracture'));assert.equal(g.phase,'victory');continueAfterBattle(g);g.battle=null;}
test('A new journey starts with Kael alone, valid saves and locked travel',()=>{const g=fresh();assert.equal(g.campaign.zone,'village');assert.equal(g.campaign.recruited,false);assert(!travel(g,'road'));assert(!travel(g,'crypts'));assert(deserialize(serialize(g)));beginBattle(g,ROAD_ENCOUNTERS[0]);assert(!canUse(g,'frost'));assert(canUse(g,'fracture'));const hp=g.heroes[1].hp;for(let i=0;i<400;i++)tick(g,1/60);assert.equal(g.heroes[1].hp,hp);});
test('The road commission, level up, glassworks investigation and recruitment form a playable quest chain',()=>{const g=fresh();assert(campaignAction(g,'accept'));assert(travel(g,'road'));for(const e of ROAD_ENCOUNTERS)win(g,e);assert.equal(g.campaign.stage,2);assert(g.campaign.level>=2);assert(g.heroes[0].maxHp>180);assert(travel(g,'village'));assert(campaignAction(g,'report'));assert.equal(g.campaign.stage,3);assert(travel(g,'glassworks'));win(g,FURNACE);assert.equal(g.campaign.stage,4);assert(campaignAction(g,'recruit'));assert(g.campaign.recruited);assert(!travel(g,'crypts'));assert(travel(g,'annealing'));g.position={...EXPEDITION_FIXTURES.ledger};assert(campaignAction(g,'ledger'));assert(travel(g,'crypts'));assert(deserialize(serialize(g)));beginBattle(g,{id:'watch',kind:'wraith',x:3,y:5});assert(canUse(g,'frost'));});
test('Equipment and consumables have real costs, effects and ownership constraints',()=>{const g=fresh();g.gold=150;assert(campaignAction(g,'buy-weapon'));assert.equal(g.heroes[0].attack,21);assert(!campaignAction(g,'buy-weapon'));assert(campaignAction(g,'buy-armor'));assert.equal(g.heroes[0].maxHp,200);assert(campaignAction(g,'buy-charm'));g.heroes[0].hp=10;assert(campaignAction(g,'potion'));assert.equal(g.heroes[0].hp,90);assert.equal(g.campaign.potions,2);assert(campaignAction(g,'rest'));assert.equal(g.heroes[0].hp,200);assert.equal(g.gold,30);});
test('A cleared road sector repopulates only after twenty seconds outside it',()=>{const g=fresh();campaignAction(g,'accept');travel(g,'road');win(g,ROAD_ENCOUNTERS[0]);g.position={x:2,y:1};g.playTime=10;updateRespawns(g);assert.equal(g.roaming.size,0);travel(g,'village');g.playTime=29;updateRespawns(g);assert.equal(g.roaming.size,0);g.playTime=30;updateRespawns(g);assert(g.roaming.has('road-shards'));assert.equal(g.campaign.roadCleared.length,1);});
test('Road movement and campaign migration survive coordinates outside the old crypt map',()=>{const g=fresh();campaignAction(g,'accept');travel(g,'road');g.position={x:19,y:6};assert.equal(roadMove(g,0).id,'road-lantern');assert(deserialize(serialize(g)));const bad=JSON.parse(serialize(g));bad.campaign.level=999;assert.equal(deserialize(JSON.stringify(bad)),null);const legacy=createGame();legacy.cleared.add('first');assert.equal(deserialize(serialize(legacy)).campaign,undefined);});
test('Title, village and outdoor music follow the actual chapter scene',()=>{const g=fresh();assert.equal(musicScene(g,false),'title');assert.equal(musicScene(g,true),'village');campaignAction(g,'accept');travel(g,'road');assert.equal(musicScene(g,true),'road');});
test('XP cannot remove existing equipment bonuses and subsequent levels grow predictably',()=>{const g=fresh();g.gold=100;campaignAction(g,'buy-weapon');const first=g.heroes[0].attack;grantXp(g,50);assert.equal(g.campaign.level,2);assert.equal(g.heroes[0].attack,first+3);assert.equal(g.campaign.xp,0);assert(deserialize(serialize(g)));});
test('Victory and level-up preserve wounds, spent MP and knockouts through travel and saving',()=>{
 const g=fresh();
 Object.assign(g.campaign,{stage:5,recruited:true,zone:'glassworks'});
 g.heroes[0].hp=91;
 g.heroes[0].mp=12;
 g.heroes[1].hp=0;
 g.heroes[1].mp=7;
 win(g,FURNACE);
 assert.equal(g.campaign.level,2);
 assert.equal(g.gold,40);
 assert(travel(g,'village'));
 const loaded=deserialize(serialize(g));
 assert.deepEqual(loaded.heroes.map(h=>[h.hp,h.mp]),[[91,7],[0,7]]);
 assert(campaignAction(loaded,'rest'));
 assert.equal(loaded.gold,35);
 assert.deepEqual(loaded.heroes.map(h=>[h.hp,h.mp]),loaded.heroes.map(h=>[h.maxHp,h.maxMp]));
 assert(!campaignAction(loaded,'rest'));
 assert.equal(loaded.gold,35);
});
test('The full first chapter can be completed through road, recruitment, crypt movement and final report',async()=>{
 const {move,turn,interact}=await import('../src/engine.ts');const {CHEST,GATE,DIRECTIONS,wall}=await import('../src/world.ts');const g=fresh();
 function fight(){for(let frame=0;frame<120*60&&g.phase==='combat';frame++){const e=g.battle.enemies[0];if(g.heroes.some((h,i)=>(i===0||g.campaign.recruited)&&h.hp>0&&h.hp<h.maxHp*.65))useSkill(g,'heal');if(e.windup>0)useSkill(g,'frost');if(g.battle.cooldowns.frost>1||!e.windup)useSkill(g,'fracture');tick(g,1/60);}assert.equal(g.phase,'victory');continueAfterBattle(g);}
 campaignAction(g,'accept');travel(g,'road');for(const e of ROAD_ENCOUNTERS){beginBattle(g,e);fight();}travel(g,'village');campaignAction(g,'report');travel(g,'glassworks');beginBattle(g,FURNACE);fight();campaignAction(g,'recruit');travel(g,'annealing');for(const key of ['westBurner','eastBurner']){g.position={...EXPEDITION_FIXTURES[key]};assert(campaignAction(g,key));}assert(travel(g,'crypts'));
 function go(goal){for(let attempts=0;attempts<250&&(g.position.x!==goal.x||g.position.y!==goal.y);attempts++){
  if(g.phase==='combat')fight();const seen=new Set([`${g.position.x},${g.position.y}`]),queue=[{...g.position,path:[]}];let path;
  for(const p of queue){if(p.x===goal.x&&p.y===goal.y){path=p.path;break;}for(let d=0;d<4;d++){const[dx,dy]=DIRECTIONS[d],x=p.x+dx,y=p.y+dy,key=`${x},${y}`;if(wall(x,y)||!g.gateOpen&&x===GATE.x&&y===GATE.y||seen.has(key))continue;seen.add(key);queue.push({x,y,path:[...p.path,d]});}}
  assert(path?.length);while(g.direction!==path[0]&&g.phase==='explore')turn(g,1);if(g.phase==='combat'){fight();continue;}move(g,0);if(g.phase==='combat')fight();
 }assert.deepEqual(g.position,goal);}
 go(CHEST);interact(g);go({x:17,y:8});interact(g);assert(g.gateOpen);go({x:17,y:12});assert(g.cleared.has('guardian'));assert.equal(g.campaign.stage,6);assert(travel(g,'village'));assert(campaignAction(g,'ending'));assert.equal(g.campaign.stage,7);assert(deserialize(serialize(g)));
});
test('A distant patrol in the crypts does not block the road from repopulating',()=>{const g=fresh();campaignAction(g,'accept');travel(g,'road');win(g,ROAD_ENCOUNTERS[0]);g.cleared.add('first');g.roaming.add('first');travel(g,'village');g.playTime=25;updateRespawns(g);assert(g.roaming.has('road-shards'));assert.equal(g.roaming.size,2);assert(deserialize(serialize(g)));});

test('Neris can protect against a strike and set up one stronger Fracture',()=>{
 const g=fresh();
 Object.assign(g.campaign,{stage:14,recruited:true,bellShortcut:true});
 refreshStats(g);
 g.heroes[1].mp=g.heroes[1].maxMp;
 beginBattle(g,ENCOUNTERS.find(e=>e.id==='guardian'));
 assert(!canUse(g,'frost'));
 assert(!canUse(g,'heal'));
 assert(useSkill(g,'breakwater'));
 const hp=g.heroes.map(h=>h.hp);
 const e=g.battle.enemies[0];
 e.windup=.02;
 tick(g,.04);
 assert.deepEqual(g.heroes.map(h=>h.hp),hp.map(n=>n-18));
 assert.equal(g.battle.shield,0);
 g.battle.globalCooldown=0;
 assert(useSkill(g,'hook'));
 const remaining=e.hp;
 g.battle.globalCooldown=0;
 assert(useSkill(g,'fracture'));
 assert.equal(remaining-e.hp,Math.round(skillPower(g,'fracture')*1.5));
 assert.equal(g.battle.exposed,false);
});

test('The Drowned Keeper can be defeated with Lys using the regular combat timers',()=>{
 const g=fresh();
 Object.assign(g.campaign,{stage:10,recruited:true,zone:'lockworks',level:5});
 refreshStats(g);
 g.heroes.forEach(h=>{h.hp=h.maxHp;h.mp=h.maxMp;});
 const keeper=CAMPAIGN_ENCOUNTERS.find(e=>e.id==='bell-keeper');
 assert(beginBattle(g,keeper));
 for(let frame=0;frame<60*90&&g.phase==='combat';frame++){
   const e=g.battle.enemies[0];
   if(g.heroes.some(h=>h.hp<h.maxHp*.6))useSkill(g,'heal');
   if(e.windup>0){useSkill(g,'frost');useSkill(g,'fracture');}
   tick(g,1/60);
 }
 assert.equal(g.phase,'victory');
 assert.equal(g.campaign.stage,11);
 assert(g.heroes.some(h=>h.hp>0));
});

test('Turning in the courier’s evidence changes the party mana ceiling exactly once and persists it',()=>{
 const g=fresh();
 Object.assign(g.campaign,{stage:7,recruited:true});
 assert(!campaignAction(g,'report-courier'));
 assert(travel(g,'annealing'));
 g.position={x:EXPEDITION_FIXTURES.ledger.x,y:EXPEDITION_FIXTURES.ledger.y};
 assert(campaignAction(g,'ledger'));
 assert(travel(g,'village'));
 const before=g.heroes.map(h=>h.maxMp);
 const mana=g.heroes.map(h=>h.mp);
 assert(campaignAction(g,'report-courier'));
 assert(!campaignAction(g,'report-courier'));
 const after=before.map(max=>max+4);
 assert.deepEqual(g.heroes.map(h=>h.maxMp),after);
 assert.deepEqual(g.heroes.map(h=>h.mp),mana);
 assert.deepEqual(deserialize(serialize(g)).heroes.map(h=>h.maxMp),after);
});

test('Fracture breaks shell armour before dealing damage',()=>{
 const g=fresh(),guard=CAMPAIGN_ENCOUNTERS.find(e=>e.id==='annealing-archives');
 assert(beginBattle(g,guard));
 const e=g.battle.enemies[0],hp=e.hp;
 for(let i=0;i<24;i++)tick(g,.1);
 assert.equal(hp-e.hp,Math.round(g.heroes[0].attack*.35));
 const remaining=e.hp;
 assert(useSkill(g,'fracture'));
 assert.equal(remaining-e.hp,skillPower(g,'fracture'));
 assert.equal(e.shell,false);
});

test('The riposte windup retaliates against the interrupter and the next normal windup can be stopped',()=>{
 const g=fresh(),wraith=CAMPAIGN_ENCOUNTERS.find(e=>e.id==='annealing-bridge');
 assert(beginBattle(g,wraith));
 for(let i=0;i<49;i++)tick(g,.1);
 const e=g.battle.enemies[0],hp=g.heroes[0].hp;
 assert(e.riposte&&e.windup>0);
 assert(useSkill(g,'fracture'));
 assert(g.heroes[0].hp<hp);
 assert.equal(e.stunned,0);
 for(let i=0;i<49;i++)tick(g,.1);
 assert(e.windup>0&&!e.riposte);
 for(let i=0;i<2;i++)tick(g,.1);
 const after=g.heroes[0].hp;
 assert(useSkill(g,'fracture'));
 assert.equal(g.heroes[0].hp,after);
 assert.equal(e.windup,0);
});
