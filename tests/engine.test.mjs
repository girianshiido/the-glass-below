import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,beginBattle,tick,togglePause,useSkill,SKILLS,move,turn,interact,continueAfterBattle,retreat,selectTarget,livingTarget,canUse} from '../src/engine.ts';
import {MAP,ENCOUNTERS,CHEST,GATE,EXIT,SHRINE,wall,lineOfSight,START,DIRECTIONS} from '../src/world.ts';
import {serialize,deserialize} from '../src/save.ts';
const battle=(kind='wraith',count=1)=>{const g=createGame();beginBattle(g,{id:'test',kind,count,x:2,y:1});return g;};
function advance(g,seconds){for(let i=0;i<seconds*60;i++)tick(g,1/60);}
test('The map is rectangular and all objectives are reachable; gate cannot be bypassed',()=>{
 assert(MAP.every(row=>row.length===MAP[0].length));
 const reachable=(open)=>{const seen=new Set([`${START.x},${START.y}`]),queue=[START];for(const p of queue)for(const[dx,dy]of DIRECTIONS){const x=p.x+dx,y=p.y+dy,key=`${x},${y}`;if(wall(x,y)||!open&&x===GATE.x&&y===GATE.y||seen.has(key))continue;seen.add(key);queue.push({x,y});}return seen;};
 const closed=reachable(false),opened=reachable(true);for(const p of [CHEST,SHRINE,...ENCOUNTERS,EXIT])assert(opened.has(`${p.x},${p.y}`));
 assert(closed.has(`${CHEST.x},${CHEST.y}`));assert(!closed.has(`${EXIT.x},${EXIT.y}`),'Exit must require opening gate');
});
test('Movement collides with walls, and turning does not reveal enemies through walls',()=>{
 const g=createGame();turn(g,-1);assert.equal(g.direction,3);assert.equal(move(g,0),false);assert.deepEqual(g.position,START);
 assert.equal(lineOfSight({x:1,y:1},{x:3,y:3}),false);
 assert.equal(lineOfSight({x:17,y:8},{x:17,y:11},false),false);
});
test('Approaching the visible first creature starts combat before entering its cell',()=>{
 const g=createGame();move(g,0);move(g,0);move(g,0);assert.equal(g.phase,'combat');assert.equal(g.position.x,4);assert.equal(g.battle.encounter,'first');
 assert.equal(move(g,0),false);
});
test('Pause freezes every timer, all HP/MP and attack animations',()=>{
 const g=battle();advance(g,4.9);togglePause(g);const before=JSON.stringify(g);advance(g,30);assert.equal(JSON.stringify(g),before);
});
test('Orders during pause reserve no mana and execute only after resuming, once',()=>{
 const g=battle();togglePause(g);const mp=g.heroes[1].mp,hp=g.battle.enemies[0].hp;
 assert(useSkill(g,'frost'));assert.equal(g.heroes[1].mp,mp);assert.equal(g.battle.enemies[0].hp,hp);assert.deepEqual(g.battle.queue,['frost']);
 advance(g,2);assert.equal(g.battle.enemies[0].hp,hp);togglePause(g);tick(g,1/60);assert.equal(g.heroes[1].mp<mp,true);assert.equal(g.battle.enemies[0].hp,hp-30);assert.equal(g.battle.queue.length,0);
 const after=g.heroes[1].mp;tick(g,1/60);assert(g.heroes[1].mp>=after);
});
test('One planned action per hero; replacing and cancelling are deterministic',()=>{
 const g=battle();togglePause(g);useSkill(g,'frost');useSkill(g,'heal');assert.deepEqual(g.battle.queue,['heal']);useSkill(g,'fracture');assert.deepEqual(g.battle.queue,['heal','fracture']);useSkill(g,'heal');assert.deepEqual(g.battle.queue,['fracture']);
});
test('Separate hero commands respect the global cooldown after resuming',()=>{
 const g=battle('sentinel');togglePause(g);useSkill(g,'fracture');useSkill(g,'frost');togglePause(g);tick(g,1/60);assert.equal(g.battle.queue.length,1);assert.equal(g.battle.cooldowns.frost,0);advance(g,.7);assert.equal(g.battle.queue.length,0);assert(g.battle.cooldowns.frost>0);
});
test('Frost interrupts a telegraphed strike; no damage lands during the stun',()=>{
 const g=battle();advance(g,5);assert(g.battle.enemies[0].windup>0);const hp=g.heroes.map(h=>h.hp);useSkill(g,'frost');assert.equal(g.battle.enemies[0].windup,0);advance(g,1.5);assert.deepEqual(g.heroes.map(h=>h.hp),hp);
});
test('Cooldowns and mana prevent unlimited casts',()=>{
 const g=battle('sentinel');assert(useSkill(g,'fracture'));assert.equal(useSkill(g,'fracture'),false);advance(g,6);g.heroes[0].mp=0;assert.equal(useSkill(g,'fracture'),false);
});
test('Reinforcements remain untargetable and inactive until the first opponent fades',()=>{
 const g=battle('scavenger',2),b=g.battle;selectTarget(g,1);assert.equal(b.target,0);
 advance(g,5);assert.equal(b.enemies[1].clock,0);assert.equal(b.enemies[1].windup,0);assert.equal(b.enemies[1].hp,115);
 b.enemies[0].hp=1;assert(useSkill(g,'fracture'));assert.equal(g.phase,'combat');assert.equal(livingTarget(g),undefined);assert.equal(canUse(g,'frost'),false);assert.equal(g.gold,0);assert(!g.cleared.has('test'));
 const hp=g.heroes.map(h=>h.hp),mp=g.heroes.map(h=>h.mp);togglePause(g);const frozen=JSON.stringify(g);advance(g,3);assert.equal(JSON.stringify(g),frozen);togglePause(g);
 advance(g,.4);assert.equal(b.wave,0);advance(g,.45);assert.equal(b.wave,1);assert.equal(b.target,1);assert.equal(livingTarget(g).id,1);assert.equal(b.nextWaveAt,null);assert.deepEqual(g.heroes.map(h=>h.hp),hp);assert(g.heroes.every((h,i)=>h.mp<mp[i]+.03));assert.equal(b.enemies[1].hp,115);
 b.enemies[1].hp=1;advance(g,2.3);assert.equal(g.phase,'victory');assert.equal(g.gold,20);assert(g.cleared.has('test'));advance(g,4);assert.equal(g.gold,20);
});
test('Queued killing blows wait for reinforcements, and retreat resets the entire encounter',()=>{
 const g=battle('wraith',2),b=g.battle;b.enemies[0].hp=1;togglePause(g);useSkill(g,'fracture');useSkill(g,'frost');togglePause(g);tick(g,.1);
 assert.equal(b.enemies[1].hp,150);assert.equal(b.enemies[1].clock,0);assert.equal(g.heroes[1].mp,44);assert.deepEqual(b.queue,[]);
 retreat(g);assert.equal(g.battle,null);assert(!g.cleared.has('test'));beginBattle(g,{id:'test',kind:'wraith',count:2,x:2,y:1});assert.equal(g.battle.wave,0);assert(g.battle.enemies.every(e=>e.hp===150));
});
test('Victory gives rewards once and retains world progress; retreat preserves damage',()=>{
 const g=battle('scavenger');g.battle.enemies[0].hp=1;advance(g,3);assert.equal(g.phase,'victory');const gold=g.gold;advance(g,20);assert.equal(g.gold,gold);assert(g.cleared.has('test'));continueAfterBattle(g);assert.equal(g.phase,'explore');
 beginBattle(g,{id:'other',x:3,y:1,kind:'wraith',count:1});g.heroes[0].hp=55;retreat(g);assert.equal(g.heroes[0].hp,55);assert.deepEqual(g.position,START);assert(!g.cleared.has('other'));
});
test('Chest and shrine can only be consumed once; gate requires key',()=>{
 const g=createGame();g.position={x:GATE.x,y:GATE.y-1};interact(g);assert.equal(g.gateOpen,false);g.position={...CHEST};interact(g);interact(g);assert.equal(g.gold,30);assert(g.key);g.position={x:GATE.x,y:GATE.y-1};interact(g);assert(g.gateOpen);
 g.heroes[0].hp=1;g.position={...SHRINE};interact(g);assert.equal(g.heroes[0].hp,g.heroes[0].maxHp);g.heroes[0].hp=1;interact(g);assert.equal(g.heroes[0].hp,1);
});
test('Save round trip restores progression; corrupt, future and inconsistent saves fail safely',()=>{
 const g=createGame();g.position={...CHEST};interact(g);g.cleared.add('first');const raw=serialize(g);const loaded=deserialize(raw);assert(loaded);assert.deepEqual(loaded.position,g.position);assert(loaded.cleared.has('first'));assert(loaded.key);assert.equal(loaded.phase,'explore');
 for(const mutate of [s=>s.version=999,s=>s.position.x=-1,s=>s.heroes[0].hp=Infinity,s=>s.heroes[0].mp=-1,s=>s.cleared=['unknown'],s=>s.seen=['999,999'],s=>s.gateOpen=true,s=>s.heroes[0].hp=999]){const s=JSON.parse(serialize(createGame()));mutate(s);assert.equal(deserialize(JSON.stringify(s)),null);}
 assert.equal(deserialize('invalid'),null);
});
test('All encounters can be beaten by a plausible player using telegraph counters',()=>{
 for(const kind of ['scavenger','wraith','sentinel']){
  const g=battle(kind);for(let t=0;t<120*60&&g.phase==='combat';t++){
    const e=g.battle.enemies.find(e=>e.hp>0);
    if(g.heroes.some(h=>h.hp>0&&h.hp<h.maxHp*.65))useSkill(g,'heal');
    if(e?.windup>0)useSkill(g,'frost');
    if(g.battle.cooldowns.frost>1||!e?.windup)useSkill(g,'fracture');
    tick(g,1/60);
  }
  assert.equal(g.phase,'victory',`${kind}: plausible decisions should win`);
 }
});
test('A complete expedition works through real movements, encounters, key, gate and exit',()=>{
 const g=createGame();
 function fight(){for(let t=0;t<120*60&&g.phase==='combat';t++){
  const e=g.battle.enemies.find(e=>e.hp>0);
  if(g.heroes.some(h=>h.hp>0&&h.hp<h.maxHp*.65))useSkill(g,'heal');
  if(e?.windup>0)useSkill(g,'frost');
  if(g.battle.cooldowns.frost>1||!e?.windup)useSkill(g,'fracture');tick(g,1/60);
 }assert.equal(g.phase,'victory');continueAfterBattle(g);}
 function go(goal){
  for(let attempts=0;attempts<300&&(g.position.x!==goal.x||g.position.y!==goal.y);attempts++){
   if(g.phase==='combat')fight();
   const seen=new Set([`${g.position.x},${g.position.y}`]),queue=[{...g.position,path:[]}];let path;
   for(const p of queue){if(p.x===goal.x&&p.y===goal.y){path=p.path;break;}for(let d=0;d<4;d++){const[dx,dy]=DIRECTIONS[d],x=p.x+dx,y=p.y+dy,k=`${x},${y}`;if(wall(x,y)||!g.gateOpen&&x===GATE.x&&y===GATE.y||seen.has(k))continue;seen.add(k);queue.push({x,y,path:[...p.path,d]});}}
   assert(path?.length,'Goal must have a path');const d=path[0];
   while(g.direction!==d&&g.phase==='explore')turn(g,1);
   if(g.phase==='combat'){fight();continue;}move(g,0);if(g.phase==='combat')fight();
  }
  assert.deepEqual(g.position,goal);
 }
 go(CHEST);interact(g);assert(g.key);
 go(SHRINE);interact(g);
 go({x:17,y:8});interact(g);assert(g.gateOpen);
 go(EXIT);assert(g.cleared.has('guardian'));assert.equal(g.phase,'complete');assert(deserialize(serialize(g)));
});
