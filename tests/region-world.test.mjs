import {EXPEDITION_FIXTURES,ANNEALING_DOOR,BELL_BARRIER} from '../src/expedition-world.ts';
import {cryptAccess,keeperAccess,lowWater} from '../src/expedition-state.ts';
import {MOORING,SLUICE_WHEEL,TIDE_GATE,ROAD_TO_ESTUARY,ROAD_FROM_ESTUARY} from '../src/estuary-world.ts';
import {CRYPT_TORCHES} from '../src/scene-lights.ts';
import {forestTrees,CELL} from '../src/region-geometry.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createGame,move,interact,turn,useSkill,continueAfterBattle,partySkills} from '../src/engine.ts';
import {setupCampaign,campaignAction,ROAD_ENCOUNTERS,companion,travel} from '../src/campaign.ts';
import {REGION_WORLDS,regionOf,regionWall,nearbyResident,regionSight,regionOffset,sharedOutdoors,entranceAhead,nearbyEntrance,entrancePoint,residentApproach,INTERACTION_REACH,RESIDENT_STOP_DISTANCE,trailCoverage,nearbyFixture,regionObstacle,COASTAL_TRAIL_VIEW} from '../src/region-world.ts';
import {DIRECTIONS,CHEST,GATE} from '../src/world.ts';
import {serialize,deserialize} from '../src/save.ts';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const point=({x,y})=>({x,y});
function route(zone,start,goal,blocked=()=>false){const q=[{...start,path:[]}],seen=new Set([`${start.x},${start.y}`]);for(const p of q){if(same(p,goal))return p.path;for(let d=0;d<4;d++){const[dx,dy]=DIRECTIONS[d],n={x:p.x+dx,y:p.y+dy},key=`${n.x},${n.y}`;if(seen.has(key)||regionWall(zone,n.x,n.y)||blocked(n))continue;seen.add(key);q.push({...n,path:[...p.path,d]});}}}
function win(g){g.battle.enemies[0].hp=1;g.heroes[0].mp=g.heroes[0].maxMp;g.battle.cooldowns.fracture=0;g.battle.globalCooldown=0;useSkill(g,'fracture');assert.equal(g.phase,'victory');continueAfterBattle(g);}
function go(g,goal){for(let i=0;i<300&&!same(g.position,goal);i++){if(g.phase==='combat')win(g);const r=regionOf(g),path=route(r.zone,g.position,goal,n=>r.residents.some(p=>same(p,n)&&!(p.id==='lys'&&g.campaign.recruited))||!g.gateOpen&&r.zone==='crypts'&&same(n,GATE)||!!regionObstacle(g,n)||r.passages.some(p=>same(p,n)));assert(path?.length,`No route to ${JSON.stringify(goal)} in ${r.zone}`);while(g.direction!==path[0]&&g.phase==='explore')turn(g,1);if(g.phase==='combat'){win(g);continue;}move(g,0);if(g.phase==='combat')win(g);}assert.deepEqual(g.position,goal);}
test('Each region supports broad spaces, visible distant scenery and collision-safe passages',()=>{
 for(const w of Object.values(REGION_WORLDS)){assert(w.map.every(row=>row.length===w.map[0].length));assert(!regionWall(w.zone,w.spawn.x,w.spawn.y));for(const p of w.passages){assert(!regionWall(w.zone,p.x,p.y));assert(!regionWall(p.to,p.spawn.x,p.spawn.y));}}
 assert(regionSight('village',{x:10,y:12},{x:10,y:9}));assert(regionSight('glassworks',{x:11,y:16},{x:11,y:8}));
 assert(REGION_WORLDS.crypts.map.slice(10,13).every(row=>row.slice(11,18)==='.......'));
 assert.equal(route('crypts',{x:1,y:1},{x:17,y:12},p=>same(p,GATE)),undefined,'The large hall must not bypass the copper gate');
 for(const e of REGION_WORLDS.crypts.encounters)assert(route('crypts',{x:1,y:1},e));assert(route('crypts',{x:1,y:1},CHEST));
});
test('The entire village-road-glassworks-crypt route uses physical gates and staircases, with return paths',()=>{
 const g=setupCampaign(createGame());go(g,{x:9,y:7});g.direction=3;assert.equal(nearbyResident(g),undefined);assert.equal(nearbyResident(g,residentApproach(g)).id,'elara');campaignAction(g,'accept');
 go(g,{x:19,y:8});while(g.direction!==0)turn(g,1);move(g,0);assert.equal(g.campaign.zone,'village');interact(g);assert(g.campaign.villageGateOpen);assert.equal(g.campaign.zone,'village');interact(g);assert.equal(g.campaign.zone,'village','Wait for the visible opening animation');g.playTime+=1;interact(g);assert.equal(g.campaign.zone,'road');assert.deepEqual(g.position,{x:0,y:10});
 for(const e of ROAD_ENCOUNTERS){go(g,{x:e.x-1,y:e.y});while(g.direction!==0&&g.phase==='explore')turn(g,1);if(g.phase==='combat')win(g);}assert.equal(g.campaign.stage,2);
 go(g,{x:23,y:6});interact(g);assert.equal(g.campaign.zone,'glassworks');assert.deepEqual(g.position,{x:11,y:16});
 go(g,{x:11,y:8});while(g.direction!==3&&g.phase==='explore')turn(g,1);if(g.phase==='combat')win(g);assert.equal(g.campaign.stage,4);
 go(g,{x:18,y:2});g.direction=1;assert.equal(nearbyResident(g,residentApproach(g)).id,'lys');assert(campaignAction(g,'recruit'));go(g,{x:19,y:1});interact(g);assert.equal(g.campaign.zone,'glassworks');
 go(g,{x:ANNEALING_DOOR.x+1,y:ANNEALING_DOOR.y});g.direction=2;assert(move(g,0));assert.equal(g.campaign.zone,'annealing');
 go(g,point(EXPEDITION_FIXTURES.ledger));assert.equal(nearbyFixture(g).id,'ledger');assert(campaignAction(g,'ledger'));assert(cryptAccess(g));
 go(g,{x:11,y:2});g.direction=3;assert(!move(g,0),'Ledger alone does not open the service shortcut');
 for(const key of ['westBurner','eastBurner']){go(g,point(EXPEDITION_FIXTURES[key]));assert(campaignAction(g,key));}
 go(g,{x:11,y:2});g.direction=3;assert(move(g,0));assert.equal(g.campaign.zone,'glassworks');
 go(g,{x:19,y:1});interact(g);assert.equal(g.campaign.zone,'crypts');
 go(g,{x:1,y:2});interact(g);assert.equal(g.campaign.zone,'glassworks');go(g,{x:11,y:17});interact(g);assert.equal(g.campaign.zone,'road');go(g,{x:1,y:10});interact(g);assert.equal(g.campaign.zone,'village');assert(deserialize(serialize(g)));
});
test('Version-one chapter saves retain progression, gear, health and story when moved into the 3D world',()=>{
 const g=setupCampaign(createGame());campaignAction(g,'accept');g.campaign.zone='road';g.campaign.weapon='tempered';g.campaign.introRead=true;g.position={x:6,y:1};g.heroes[0].hp=73;g.campaign.worldVersion=undefined;g.campaign.worldSeen=undefined;
 const loaded=deserialize(serialize(g));assert(loaded);assert.deepEqual(loaded.position,REGION_WORLDS.road.spawn);assert.equal(loaded.heroes[0].hp,73);assert.equal(loaded.campaign.weapon,'tempered');assert.equal(loaded.campaign.stage,1);assert.equal(loaded.campaign.worldVersion,3);assert(loaded.campaign.introRead);
 const bad=JSON.parse(serialize(loaded));bad.campaign.worldVersion=500;assert.equal(deserialize(JSON.stringify(bad)),null);
});
test('Buildings and residents occupy solid locations, while clearing paths can be approached in two dimensions',()=>{
 const g=setupCampaign(createGame());g.position={x:4,y:8};g.direction=3;assert(!move(g,0));assert.deepEqual(g.position,{x:4,y:8});g.position={x:9,y:7};g.direction=3;assert(!move(g,0));assert.deepEqual(g.position,{x:9,y:7});
 assert(route('road',{x:10,y:8},{x:12,y:10}));assert(route('glassworks',{x:8,y:4},{x:15,y:14}));
});

test('The village gate has continuous outdoor coordinates in both directions',()=>{const g=setupCampaign(createGame());campaignAction(g,'accept');g.campaign.villageGateOpen=true;g.position={x:19,y:8};g.direction=0;const before={...g.position};assert(move(g,0));assert.equal(g.campaign.zone,'road');const offset=regionOffset('road');assert.equal(g.position.x+offset.x-before.x,1);assert.equal(g.position.y+offset.y,before.y);assert(sharedOutdoors('village','road'));assert(!sharedOutdoors('road','glassworks'));g.position={x:1,y:10};g.direction=2;assert(move(g,0));assert.equal(g.campaign.zone,'village');assert.deepEqual(g.position,{x:20,y:8});assert.equal(g.direction,2);});
test('Each visible woodland threat covers its trail, including sideways approaches',()=>{for(const e of ROAD_ENCOUNTERS){assert.equal(route('road',{x:0,y:10},{x:23,y:6},p=>Math.hypot(p.x-e.x,p.y-e.y)<=2.15&&regionSight('road',p,e)),undefined,`Cannot bypass ${e.id} outside its visible reach`);}const g=setupCampaign(createGame());g.campaign.zone='road';g.position={x:12,y:10};g.direction=3;move(g,0);assert.equal(g.phase,'combat');assert.equal(g.battle.encounter,'road-hollow');});
test('Inn and merchant are reached through doors, and remain inside their buildings',()=>{const g=setupCampaign(createGame());const village=REGION_WORLDS.village;assert.deepEqual(village.residents.map(n=>n.id),['elara']);assert.equal(village.entrances.length,2);g.position={x:4,y:9};g.direction=3;assert.equal(entranceAhead(g),undefined);move(g,0);assert.equal(entranceAhead(g).id,'inn');g.direction=0;assert.equal(entranceAhead(g),undefined);g.position={x:16,y:12};g.direction=3;assert.equal(entranceAhead(g),undefined);move(g,0);assert.equal(entranceAhead(g).id,'shop');assert(village.map.length<21);assert(village.map[0].length<25);});
test('Version-two saves survive the smaller village and woodland trail without losing progress',()=>{const g=setupCampaign(createGame());g.campaign.worldVersion=2;g.position={x:23,y:10};g.heroes[0].hp=67;g.gold=81;let restored=deserialize(serialize(g));assert(restored);assert.deepEqual(restored.position,REGION_WORLDS.village.spawn);assert.equal(restored.heroes[0].hp,67);assert.equal(restored.gold,81);g.campaign.zone='road';g.position={x:12,y:12};restored=deserialize(serialize(g));assert(restored);assert(!regionWall('road',restored.position.x,restored.position.y));assert.equal(restored.campaign.worldVersion,3);});

test('Forest canopies stay clear of every traversable trail tile',()=>{const trees=forestTrees();assert(trees.length>100);for(const tree of trees)for(let y=0;y<21;y++)for(let x=0;x<25;x++)if(!regionWall('road',x,y)){const distance=Math.hypot(Math.max(0,Math.abs(tree.x-x*CELL)-CELL/2),Math.max(0,Math.abs(tree.z-y*CELL)-CELL/2));assert(distance>=tree.radius+.45-1e-8);}});
test('The tollgate is reached by a side trail, stays locked, and returns travellers to the same fork',()=>{
 const g=setupCampaign(createGame());
 assert(campaignAction(g,'accept'));assert(travel(g,'road'));
 g.position={x:ROAD_TO_ESTUARY.x,y:8};g.direction=3;
 assert(move(g,0));assert(move(g,0));
 assert.deepEqual(g.position,ROAD_FROM_ESTUARY);
 assert(!move(g,0));assert.equal(g.campaign.zone,'road');
 assert(!move(g,-1));assert(!move(g,1),'The rock shoulders cannot be walked around here');
 g.campaign.stage=8;g.campaign.recruited=true;
 assert(move(g,0));assert.equal(g.campaign.zone,'estuary');
 g.direction=2;assert(move(g,0));assert.equal(g.campaign.zone,'road');
 assert.deepEqual(g.position,ROAD_FROM_ESTUARY);
 assert(deserialize(serialize(g)));
 for(const {x,y} of COASTAL_TRAIL_VIEW)assert(trailCoverage(x,y)>.9);
});
test('The forest ground uses a feathered, irregular trail rather than clipped square edges',()=>{for(const e of ROAD_ENCOUNTERS)assert(trailCoverage(e.x,e.y)>.9);const edge=Array.from({length:30},(_,i)=>trailCoverage(4+i/15,10.5));assert(Math.max(...edge)-Math.min(...edge)>.2);assert(edge.some(v=>v>0&&v<1));assert.equal(trailCoverage(6,14),0);});

test('Crypt torches have visible wall-side positions without obstructing the walkable cells',()=>{assert.equal(CRYPT_TORCHES.length,10);for(const p of CRYPT_TORCHES){const x=Math.round(p.x),y=Math.round(p.y);assert(!regionWall('crypts',x,y));assert(DIRECTIONS.some(([dx,dy])=>regionWall('crypts',x+dx,y+dy)));}});

test('Shop and inn open at the same physical distance after front and side approaches',()=>{for(const door of REGION_WORLDS.village.entrances){const g=setupCampaign(createGame()),[dx,dy]=DIRECTIONS[door.direction];g.direction=door.direction;g.position={x:door.x-dx,y:door.y-dy};const far={...g.position};assert.equal(entranceAhead(g),undefined);assert.equal(nearbyEntrance(g),undefined);assert(move(g,0));assert.deepEqual(g.position,{x:door.x,y:door.y});assert.equal(nearbyEntrance(g,far),undefined,'Logical movement must not allow interacting before the viewpoint arrives');assert.equal(entranceAhead(g).id,door.id);const front={...g.position};g.position={x:door.x+dy,y:door.y-dx};g.direction=(door.direction+1)%4;assert.equal(nearbyEntrance(g),undefined);assert.equal(entranceAhead(g),undefined);assert(move(g,0));assert.deepEqual(g.position,front);assert.equal(nearbyEntrance(g).id,door.id);const point=entrancePoint(door);assert(Math.hypot(point.x-g.position.x,point.y-g.position.y)*CELL<=INTERACTION_REACH);}});
test('Talking requires a short physical approach from every accessible side, including Elara and Lys',()=>{for(const zone of ['village','glassworks']){const g=setupCampaign(createGame());g.campaign.zone=zone;for(const resident of REGION_WORLDS[zone].residents)for(let direction=0;direction<4;direction++){const[dx,dy]=DIRECTIONS[direction];g.position={x:resident.x-dx,y:resident.y-dy};g.direction=direction;if(regionWall(zone,g.position.x,g.position.y))continue;assert.equal(nearbyResident(g),undefined);const close=residentApproach(g);assert(close);assert(Math.abs(Math.hypot(close.x-resident.x,close.y-resident.y)*CELL-RESIDENT_STOP_DISTANCE)<1e-8);assert.equal(nearbyResident(g,close).id,resident.id);const halfway={x:(g.position.x+close.x)/2,y:(g.position.y+close.y)/2};assert.equal(nearbyResident(g,halfway),undefined);assert.deepEqual(g.position,{x:resident.x-dx,y:resident.y-dy},'The navigation checkpoint remains on a valid grid cell');}}});
test('Close interactions respect walls, building fronts, recruitment and combat state',()=>{const g=setupCampaign(createGame());const door=REGION_WORLDS.village.entrances[1];g.position={x:door.x,y:door.y-1};assert.equal(nearbyEntrance(g),undefined);g.campaign.zone='glassworks';g.campaign.recruited=true;g.position={x:18,y:2};g.direction=1;assert.equal(residentApproach(g),undefined);g.campaign.zone='village';g.phase='combat';g.position={x:4,y:8};assert.equal(nearbyEntrance(g),undefined);assert.equal(nearbyResident(g,{x:9,y:6.4}),undefined);assert.equal(residentApproach(g),undefined);});

test('Sideways and backward movement can make the same final approach as walking forward',()=>{const g=setupCampaign(createGame());g.position={x:9,y:7};g.direction=3;const forward=residentApproach(g);g.direction=0;assert.deepEqual(residentApproach(g,-1),forward);g.direction=2;assert.deepEqual(residentApproach(g,1),forward);g.direction=1;assert.deepEqual(residentApproach(g,2),forward);});

test('An existing chapter-one save can reach Saltreach, drain the lock, meet the Keeper, depart and recruit',()=>{
 const saved=setupCampaign(createGame());
 Object.assign(saved.campaign,{stage:7,recruited:true,introRead:true,villageGateOpen:true,weapon:'tempered',level:5});
 saved.cleared=new Set(['road-shards','road-hollow','road-lantern','furnace','guardian']);
 saved.gold=163;
 saved.heroes[0].hp=127;
 const resume=state=>{const restored=deserialize(serialize(state));assert(restored);return restored;};
 let g=resume(saved);
 assert.equal(g.campaign.weapon,'tempered');
 assert.equal(g.heroes[0].hp,127);
 assert.equal(g.gold,163);
 assert.equal(companion(g),'lys');
 assert(!travel(g,'estuary'));
 assert(campaignAction(g,'follow-bell'));
 go(g,{x:19,y:8});g.direction=0;interact(g);
 assert.equal(g.campaign.zone,'road');
 go(g,ROAD_FROM_ESTUARY);g.direction=3;assert(move(g,0));
 assert.equal(g.campaign.zone,'estuary');
 assert(!campaignAction(g,'drain-lock'));

 go(g,{x:11,y:10});g.direction=3;assert.equal(entranceAhead(g),undefined);
 assert(move(g,0));
 assert.equal(entranceAhead(g).id,'neris');
 assert(campaignAction(g,'meet-neris'));
 go(g,{x:28,y:9});g.direction=0;assert(move(g,0));assert.equal(g.campaign.zone,'warehouse');
 go(g,point(EXPEDITION_FIXTURES.freight));assert(campaignAction(g,'freight'));
 go(g,{x:3,y:14});g.direction=1;assert(move(g,0));assert.equal(g.campaign.zone,'estuary');
 go(g,{x:21,y:6});interact(g);
 assert.equal(g.campaign.zone,'estuary','Water prevents use of the stairhead');
 go(g,SLUICE_WHEEL);
 assert.equal(nearbyFixture(g).id,'drain-lock');
 assert(campaignAction(g,'drain-lock'));
 go(g,{x:21,y:6});interact(g);
 assert.equal(g.campaign.zone,'lockworks');
 assert.equal(companion(g),'lys');
 assert.deepEqual(partySkills(g),['fracture','frost','heal']);
 assert(!keeperAccess(g));
 go(g,{x:12,y:5});g.direction=3;
 assert(!move(g,0));assert(regionObstacle(g,BELL_BARRIER));
 go(g,point(EXPEDITION_FIXTURES.signal));assert(campaignAction(g,'signal'));assert(keeperAccess(g));
 go(g,point(EXPEDITION_FIXTURES.lantern));assert(campaignAction(g,'lantern'));
 go(g,{x:13,y:2});
 if(!g.cleared.has('bell-keeper')){g.direction=1;turn(g,1);if(g.phase==='combat')win(g);}
 assert(g.cleared.has('bell-keeper'));
 assert(!g.campaign.bellShortcut);
 go(g,{x:13,y:1});g.direction=0;assert(move(g,0));
 assert.equal(g.campaign.zone,'estuary');
 assert.equal(g.campaign.bellShortcut,true);
 assert.equal(companion(g),'lys');
 go(g,MOORING);
 assert.equal(nearbyFixture(g).id,'part-ways');
 assert(campaignAction(g,'part-ways'));
 g=resume(g);
 assert.equal(companion(g),undefined);
 assert.deepEqual(partySkills(g),['fracture']);
 assert(!campaignAction(g,'sail-with-neris'));
 go(g,TIDE_GATE);
 assert(g.cleared.has('tide-stray'));
 assert(campaignAction(g,'secure-tide'));
 go(g,{x:11,y:9});
 const shards=g.gold;
 assert(campaignAction(g,'return-lantern'));
 assert.equal(g.gold,shards+30);
 assert(!campaignAction(g,'return-lantern'));
 assert(campaignAction(g,'sail-with-neris'));
 g=resume(g);
 assert.equal(companion(g),'neris');
 assert.equal(g.heroes[1].name,'Neris');
 assert.deepEqual(partySkills(g),['fracture','breakwater','hook']);
 assert.equal(g.campaign.weapon,'tempered');
});

test('The low-water route can reach both clues and return, and the floating route reopens after raising the sluice',()=>{
 const g=setupCampaign(createGame());
 Object.assign(g.campaign,{stage:9,recruited:true,zone:'estuary'});
 g.position={...SLUICE_WHEEL};
 assert(campaignAction(g,'drain-lock'));
 assert(lowWater(g));
 go(g,{x:23,y:9});g.direction=0;
 assert(!move(g,0),'The floating walkway has dropped out of reach');
 go(g,{x:21,y:6});interact(g);
 assert.equal(g.campaign.zone,'lockworks');
 go(g,point(EXPEDITION_FIXTURES.signal));assert(campaignAction(g,'signal'));
 assert(!keeperAccess(g));
 go(g,{x:24,y:6});g.direction=0;assert(move(g,0));
 assert.equal(g.campaign.zone,'warehouse');
 assert(g.campaign.expedition.culvert);
 go(g,point(EXPEDITION_FIXTURES.freight));assert(campaignAction(g,'freight'));
 assert(!keeperAccess(g),'The relay still needs to be set in the lock');
 go(g,{x:3,y:14});g.direction=1;assert(!move(g,0));
 go(g,{x:16,y:8});g.direction=0;assert(move(g,0));
 assert.equal(g.campaign.zone,'lockworks');
 go(g,point(EXPEDITION_FIXTURES.signal));assert(campaignAction(g,'signal'));assert(keeperAccess(g));
 go(g,{x:2,y:11});g.direction=1;assert(move(g,0));
 go(g,SLUICE_WHEEL);assert(campaignAction(g,'raise-lock'));assert(!lowWater(g));
 const restored=deserialize(serialize(g));assert(restored);assert(!lowWater(restored));
 go(restored,{x:28,y:9});restored.direction=0;assert(move(restored,0));
 assert.equal(restored.campaign.zone,'warehouse');
});

test('A saved 2.2 expedition already below the Bell bridge or the kiln remains playable',()=>{
 const g=setupCampaign(createGame());
 for(const [zone,stage,position,canEnter] of [
  ['lockworks',10,{x:13,y:2},keeperAccess],
  ['crypts',5,{x:3,y:1},cryptAccess],
 ]){
   Object.assign(g.campaign,{zone,stage,recruited:true,expedition:undefined});
   g.position=position;g.gold=81;
   const restored=deserialize(serialize(g));
   assert(restored);
   assert.deepEqual(restored.position,position);assert.equal(restored.gold,81);
   assert(canEnter(restored));
 }
});
