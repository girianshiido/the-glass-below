import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameAudio} from '../src/audio.ts';
import {parseSoundSettings,musicScene,MUSIC_FILES,MUSIC_LOOP_SECONDS,SOUND_FILES} from '../src/audio-state.ts';
import {createGame,beginBattle} from '../src/engine.ts';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function runtime(overrides={}){
 const gains=[],sources=[];let created=0;
 const context={state:'suspended',currentTime:0,destination:{},resume:async()=>{context.state='running';},suspend:async()=>{context.state='suspended';},
  createGain(){const gain={value:1,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}};const node={gain,connect(){},disconnect(){}};gains.push(node);return node;},
  createBufferSource(){const source={loop:false,buffer:null,onended:null,connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;},
  decodeAudioData:async bytes=>({duration:60,tag:new TextDecoder().decode(bytes)})};
 const fetch=async file=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(file).buffer});
 const audio=new GameAudio({createContext:()=>{created++;return context;},fetch,now:()=>100,...overrides});
 return{audio,context,gains,sources,created:()=>created};
}
test('Settings are validated and clamped without losing the global mute',()=>{
 assert.deepEqual(parseSoundSettings('{"muted":true,"music":2,"effects":-1}'),{muted:true,music:1,effects:0});
 assert.deepEqual(parseSoundSettings('bad'),{muted:false,music:.3,effects:.65});
});
test('Music follows exploration, ordinary combat and boss combat; never the title or outcome',()=>{
 const g=createGame();assert.equal(musicScene(g,false),null);assert.equal(musicScene(g,true),'level');
 beginBattle(g,{id:'test',x:4,y:1,kind:'scavenger',count:1});assert.equal(musicScene(g,true),'combat');
 g.battle.enemies[0].kind='sentinel';assert.equal(musicScene(g,true),'boss');g.phase='victory';assert.equal(musicScene(g,true),null);
});
test('Repeated gestures and same-scene updates never start duplicate music',async()=>{
 const r=runtime();r.audio.setScene('level');await r.audio.unlock();await r.audio.unlock();await flush();
 for(let i=0;i<20;i++)r.audio.setScene('level');await flush();
 assert.equal(r.created(),1);assert.equal(r.sources.filter(s=>s.started&&s.loop).length,1);assert.equal(r.sources[0].loopEnd,MUSIC_LOOP_SECONDS.level);
});
test('An outdated track load cannot start after a fast scene transition',async()=>{
 const pending=new Map();const r=runtime({fetch:file=>file.includes('/level.')?new Promise(resolve=>pending.set('level',resolve)):Promise.resolve({ok:true,arrayBuffer:async()=>new TextEncoder().encode(file).buffer})});
 r.audio.setScene('level');await r.audio.unlock();r.audio.setScene('boss');await flush();
 pending.get('level')({ok:true,arrayBuffer:async()=>new TextEncoder().encode('stale level').buffer});await flush();
 assert.equal(r.sources.filter(s=>s.started&&s.loop).length,1);assert(r.sources.find(s=>s.started).buffer.tag.includes('boss'));
});
test('Global mute silences both buses, stops effects, and blocks queued playback',async()=>{
 const r=runtime();r.audio.setScene('combat');await r.audio.unlock();await flush();r.audio.play('slash-1');await flush();assert(r.sources.some(s=>s.started&&!s.loop));
 r.audio.setSettings({muted:true});assert.equal(r.gains[0].gain.value,0);assert(r.sources.filter(s=>s.started).every(s=>s.stopped));const n=r.sources.length;r.audio.play('frost');await flush();assert.equal(r.sources.length,n);
 r.audio.setSettings({muted:false});await flush();assert.equal(r.gains[0].gain.value,1);assert.equal(r.sources.filter(s=>s.loop&&s.started&&!s.stopped).length,1);
});
test('Pausing cancels an effect still decoding and ducks music',async()=>{
 let resolveFrost;const r=runtime({fetch:file=>file.includes('/frost.')?new Promise(resolve=>{resolveFrost=resolve;}):Promise.resolve({ok:true,arrayBuffer:async()=>new TextEncoder().encode(file).buffer})});
 await r.audio.unlock();r.audio.play('frost');r.audio.setPaused(true);resolveFrost({ok:true,arrayBuffer:async()=>new TextEncoder().encode('frost').buffer});await flush();
 assert.equal(r.sources.filter(s=>s.started).length,0);assert.equal(r.gains[1].gain.value,r.audio.settings.music*.25);
 r.audio.setPaused(false);assert.equal(r.gains[1].gain.value,r.audio.settings.music);
});
test('Backgrounding suspends the single audio context and resumes it on return',async()=>{
 const r=runtime();await r.audio.unlock();r.audio.setHidden(true);assert.equal(r.context.state,'suspended');r.audio.setHidden(false);await flush();assert.equal(r.context.state,'running');assert.equal(r.created(),1);
});
test('AAC is tried when OGG cannot be decoded',async()=>{
 const r=runtime();const decode=r.context.decodeAudioData;r.context.decodeAudioData=async data=>{if(new TextDecoder().decode(data).endsWith('.ogg'))throw new Error('unsupported');return decode(data);};
 r.audio.setScene('level');await r.audio.unlock();await flush();await flush();assert(r.sources.find(s=>s.started&&s.loop).buffer.tag.endsWith('.m4a'));
});
test('Every sound has both local codecs and every score has an exact, unclipped loop',async()=>{
 for(const files of [...Object.values(MUSIC_FILES),...Object.values(SOUND_FILES)])for(const file of files)assert((await readFile(new URL('../public/'+file.slice(2),import.meta.url))).length>100);
 const manifest=JSON.parse(await readFile(new URL('../public/audio/manifest.json',import.meta.url),'utf8'));
 for(const scene of Object.keys(MUSIC_FILES)){assert(Math.abs(manifest.music[scene].seconds-MUSIC_LOOP_SECONDS[scene])<1e-5);assert(manifest.music[scene].peak<.9);assert(manifest.music[scene].rms>.03);}
});
