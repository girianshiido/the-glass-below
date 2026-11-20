import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,beginBattle,useSkill,continueAfterBattle,updateRespawns,encounterActive,RESPAWN_DELAY} from '../src/engine.ts';
import {ENCOUNTERS} from '../src/world.ts';
import {serialize,deserialize} from '../src/save.ts';
function cleared(){const g=createGame();g.position={x:1,y:7};g.cleared.add('first');g.respawnAt.first=RESPAWN_DELAY;return g;}
test('Patrols wait four minutes, stay out of sight and away from the player, and never include the boss',()=>{
 const g=cleared();g.playTime=239;updateRespawns(g);assert.equal(g.roaming.size,0);
 g.playTime=240;g.position={x:4,y:1};updateRespawns(g);assert.equal(g.roaming.size,0);
 g.position={x:1,y:1};updateRespawns(g);assert.equal(g.roaming.size,0);
 g.position={x:1,y:7};updateRespawns(g);assert.deepEqual([...g.roaming],['first']);assert(encounterActive(g,'first'));
 g.cleared.add('guardian');g.cleared.add('pair');g.respawnAt.pair=0;g.playTime=999;updateRespawns(g);assert.equal(g.roaming.size,1);assert(!encounterActive(g,'guardian'));
});
test('A returning patrol rewards once, preserves objectives, and starts a new cooldown',()=>{
 const g=cleared();g.playTime=240;updateRespawns(g);beginBattle(g,ENCOUNTERS[0]);g.battle.enemies[0].hp=1;g.heroes[0].hp=100;g.heroes[0].mp=20;useSkill(g,'fracture');
 assert.equal(g.phase,'victory');assert.equal(g.gold,10);assert.equal(g.heroes[0].hp,106);assert.equal(g.heroes[0].mp,19);assert.equal(g.roaming.size,0);assert.equal(g.cleared.size,1);assert.equal(g.respawnAt.first,480);
 continueAfterBattle(g);updateRespawns(g);assert.equal(g.roaming.size,0);
});
test('Save restores returning patrols and migrates old saves without an immediate respawn',()=>{
 const g=cleared();g.playTime=240;updateRespawns(g);const s=serialize(g);assert.deepEqual([...deserialize(s).roaming],['first']);assert.equal(deserialize(s).respawnAt.first,240);
 const old=JSON.parse(s);delete old.roaming;delete old.respawnAt;const migrated=deserialize(JSON.stringify(old));assert.equal(migrated.roaming.size,0);assert.equal(migrated.respawnAt.first,480);
 for(const mutate of [s=>s.roaming=['guardian'],s=>s.respawnAt={first:-1},s=>s.roaming=['first','pair']]){const bad=JSON.parse(s);mutate(bad);assert.equal(deserialize(JSON.stringify(bad)),null);}
});
