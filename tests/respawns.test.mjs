import {setupCampaign} from "../src/campaign.ts";
import {REGION_WORLDS} from "../src/region-world.ts";
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,beginBattle,useSkill,continueAfterBattle,updateRespawns,encounterActive,RESPAWN_DELAY} from '../src/engine.ts';
import {ENCOUNTERS} from '../src/world.ts';
import {serialize,deserialize} from '../src/save.ts';
function cleared(){const g=createGame();g.position={x:1,y:7};g.cleared.add('first');g.respawnAt.first=RESPAWN_DELAY;return g;}
test('Patrols wait twenty seconds, stay out of sight and away from the player, and never include the boss',()=>{
 const g=cleared();g.playTime=19;updateRespawns(g);assert.equal(g.roaming.size,0);
 g.playTime=20;g.position={x:4,y:1};updateRespawns(g);assert.equal(g.roaming.size,0);
 g.position={x:1,y:1};updateRespawns(g);assert.equal(g.roaming.size,0);
 g.position={x:1,y:7};g.playTime=40;updateRespawns(g);assert.deepEqual([...g.roaming],['first']);assert(encounterActive(g,'first'));
 g.cleared.add('guardian');g.cleared.add('pair');g.respawnAt.pair=0;g.playTime=999;updateRespawns(g);assert.equal(g.roaming.size,1);assert(!encounterActive(g,'guardian'));
});
test('A returning patrol rewards once, preserves objectives, and starts a new cooldown',()=>{
 const g=cleared();g.playTime=20;updateRespawns(g);beginBattle(g,ENCOUNTERS[0]);g.battle.enemies[0].hp=1;g.heroes[0].hp=100;g.heroes[0].mp=20;useSkill(g,'fracture');
 assert.equal(g.phase,'victory');assert.equal(g.gold,10);assert.equal(g.heroes[0].hp,106);assert.equal(g.heroes[0].mp,19);assert.equal(g.roaming.size,0);assert.equal(g.cleared.size,1);assert.equal(g.respawnAt.first,40);
 continueAfterBattle(g);updateRespawns(g);assert.equal(g.roaming.size,0);
});
test('Save restores returning patrols and migrates old saves without an immediate respawn',()=>{
 const g=cleared();g.playTime=20;updateRespawns(g);const s=serialize(g);assert.deepEqual([...deserialize(s).roaming],['first']);assert.equal(deserialize(s).respawnAt.first,20);
 const old=JSON.parse(s);delete old.roaming;delete old.respawnAt;const migrated=deserialize(JSON.stringify(old));assert.equal(migrated.roaming.size,0);assert.equal(migrated.respawnAt.first,40);
 for(const mutate of [s=>s.roaming=['guardian'],s=>s.respawnAt={first:-1},s=>s.roaming=['first','pair']]){const bad=JSON.parse(s);mutate(bad);assert.equal(deserialize(JSON.stringify(bad)),null);}
});

test('Cleared roads and other campaign areas repopulate independently and preserve story bosses',()=>{
 const g=setupCampaign(createGame());
 g.campaign.stage=7;
 g.campaign.recruited=true;
 const road=REGION_WORLDS.road.encounters.map(e=>e.id);
 for(const id of [...road,'kiln-crawler','loading-bay','furnace','guardian'])g.cleared.add(id);
 updateRespawns(g);
 g.playTime=19.99;
 updateRespawns(g);
 assert.equal(g.roaming.size,0);
 g.playTime=20;
 updateRespawns(g);
 assert.equal(road.filter(id=>g.roaming.has(id)).length,2);
 assert(g.roaming.has('kiln-crawler'));
 assert(g.roaming.has('loading-bay'));
 assert(!g.roaming.has('furnace'));
 assert(!g.roaming.has('guardian'));
 assert.deepEqual(deserialize(serialize(g)).roaming,g.roaming);
 assert.equal(g.campaign.stage,7);
});

test('A campaign patrol timer resets when the player comes back into sight',()=>{
 const g=setupCampaign(createGame());
 g.campaign.stage=1;
 g.campaign.zone='road';
 g.cleared.add('road-shards');
 g.position={x:19,y:6};
 updateRespawns(g);
 g.playTime=18;
 g.position={x:5,y:10};
 updateRespawns(g);
 g.playTime=20;
 g.position={x:19,y:6};
 updateRespawns(g);
 g.playTime=39;
 updateRespawns(g);
 assert(!g.roaming.has('road-shards'));
 g.playTime=40;
 updateRespawns(g);
 assert(g.roaming.has('road-shards'));
});
