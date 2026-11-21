import {test} from 'node:test';import assert from 'node:assert/strict';
import {createGame,move,interact,turn,useSkill,continueAfterBattle} from '../src/engine.ts';
import {setupCampaign,campaignAction,ROAD_ENCOUNTERS} from '../src/campaign.ts';
import {REGION_WORLDS,regionOf,regionWall,nearbyResident,regionSight} from '../src/region-world.ts';
import {DIRECTIONS,CHEST,GATE} from '../src/world.ts';
import {serialize,deserialize} from '../src/save.ts';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
function route(zone,start,goal,blocked=()=>false){const q=[{...start,path:[]}],seen=new Set([`${start.x},${start.y}`]);for(const p of q){if(same(p,goal))return p.path;for(let d=0;d<4;d++){const[dx,dy]=DIRECTIONS[d],n={x:p.x+dx,y:p.y+dy},key=`${n.x},${n.y}`;if(seen.has(key)||regionWall(zone,n.x,n.y)||blocked(n))continue;seen.add(key);q.push({...n,path:[...p.path,d]});}}}
function win(g){g.battle.enemies[0].hp=1;g.heroes[0].mp=g.heroes[0].maxMp;g.battle.cooldowns.fracture=0;g.battle.globalCooldown=0;useSkill(g,'fracture');assert.equal(g.phase,'victory');continueAfterBattle(g);}
function go(g,goal){for(let i=0;i<300&&!same(g.position,goal);i++){if(g.phase==='combat')win(g);const r=regionOf(g),path=route(r.zone,g.position,goal,n=>r.residents.some(p=>same(p,n)&&!(p.id==='lys'&&g.campaign.recruited))||!g.gateOpen&&r.zone==='crypts'&&same(n,GATE)||r.passages.some(p=>same(p,n)));assert(path?.length,`No route to ${JSON.stringify(goal)} in ${r.zone}`);while(g.direction!==path[0]&&g.phase==='explore')turn(g,1);if(g.phase==='combat'){win(g);continue;}move(g,0);if(g.phase==='combat')win(g);}assert.deepEqual(g.position,goal);}
test('Each region supports broad spaces, visible distant scenery and collision-safe passages',()=>{
 for(const w of Object.values(REGION_WORLDS)){assert(w.map.every(row=>row.length===w.map[0].length));assert(!regionWall(w.zone,w.spawn.x,w.spawn.y));for(const p of w.passages){assert(!regionWall(w.zone,p.x,p.y));assert(!regionWall(p.to,p.spawn.x,p.spawn.y));}}
 assert(regionSight('village',{x:12,y:15},{x:12,y:11}));assert(regionSight('glassworks',{x:11,y:16},{x:11,y:8}));
 assert(REGION_WORLDS.crypts.map.slice(10,13).every(row=>row.slice(11,18)==='.......'));
 assert.equal(route('crypts',{x:1,y:1},{x:17,y:12},p=>same(p,GATE)),undefined,'The large hall must not bypass the copper gate');
 for(const e of REGION_WORLDS.crypts.encounters)assert(route('crypts',{x:1,y:1},e));assert(route('crypts',{x:1,y:1},CHEST));
});
test('The entire village-road-glassworks-crypt route uses physical gates and staircases, with return paths',()=>{
 const g=setupCampaign(createGame());go(g,{x:11,y:9});assert.equal(nearbyResident(g).id,'elara');campaignAction(g,'accept');
 go(g,{x:23,y:10});while(g.direction!==0)turn(g,1);move(g,0);assert.equal(g.campaign.zone,'village');interact(g);assert(g.campaign.villageGateOpen);assert.equal(g.campaign.zone,'village');interact(g);assert.equal(g.campaign.zone,'village','Wait for the visible opening animation');g.playTime+=1;interact(g);assert.equal(g.campaign.zone,'road');assert.deepEqual(g.position,{x:1,y:10});
 for(const e of ROAD_ENCOUNTERS){go(g,{x:e.x-1,y:e.y});while(g.direction!==0&&g.phase==='explore')turn(g,1);if(g.phase==='combat')win(g);}assert.equal(g.campaign.stage,2);
 go(g,{x:23,y:6});interact(g);assert.equal(g.campaign.zone,'glassworks');assert.deepEqual(g.position,{x:11,y:16});
 go(g,{x:11,y:8});while(g.direction!==3&&g.phase==='explore')turn(g,1);if(g.phase==='combat')win(g);assert.equal(g.campaign.stage,4);
 go(g,{x:18,y:2});assert.equal(nearbyResident(g).id,'lys');assert(campaignAction(g,'recruit'));go(g,{x:19,y:1});interact(g);assert.equal(g.campaign.zone,'crypts');
 go(g,{x:1,y:2});interact(g);assert.equal(g.campaign.zone,'glassworks');go(g,{x:11,y:17});interact(g);assert.equal(g.campaign.zone,'road');go(g,{x:1,y:10});interact(g);assert.equal(g.campaign.zone,'village');assert(deserialize(serialize(g)));
});
test('Version-one chapter saves retain progression, gear, health and story when moved into the 3D world',()=>{
 const g=setupCampaign(createGame());campaignAction(g,'accept');g.campaign.zone='road';g.campaign.weapon='tempered';g.campaign.introRead=true;g.position={x:6,y:1};g.heroes[0].hp=73;g.campaign.worldVersion=undefined;g.campaign.worldSeen=undefined;
 const loaded=deserialize(serialize(g));assert(loaded);assert.deepEqual(loaded.position,REGION_WORLDS.road.spawn);assert.equal(loaded.heroes[0].hp,73);assert.equal(loaded.campaign.weapon,'tempered');assert.equal(loaded.campaign.stage,1);assert.equal(loaded.campaign.worldVersion,2);assert(loaded.campaign.introRead);
 const bad=JSON.parse(serialize(loaded));bad.campaign.worldVersion=500;assert.equal(deserialize(JSON.stringify(bad)),null);
});
test('Buildings and residents occupy solid locations, while clearing paths can be approached in two dimensions',()=>{
 const g=setupCampaign(createGame());g.position={x:5,y:10};g.direction=3;assert(!move(g,0));assert.deepEqual(g.position,{x:5,y:10});g.position={x:11,y:9};g.direction=3;assert(!move(g,0));assert.deepEqual(g.position,{x:11,y:9});
 assert(route('road',{x:10,y:5},{x:15,y:13}));assert(route('glassworks',{x:8,y:4},{x:15,y:14}));
});
