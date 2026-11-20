import './style.css';
import {createGame,tick,move,turn,interact,SKILLS,CREATURES,togglePause,useSkill,selectTarget,continueAfterBattle,retreat,livingTarget,visibleEnemy,canUse} from './engine.ts';
import type {Game,Skill} from './engine.ts';
import {CARDINALS,ENCOUNTERS,MAP} from './world.ts';
import {GAME_TITLE,LEVEL_TITLE,caption,captionOpacity,objective} from './hud.ts';
import type {TimedCaption} from './hud.ts';
import {DungeonRenderer,drawMap} from './renderer.ts';
import type {Camera} from './renderer.ts';
import {load,save,serialize,deserialize} from './save.ts';
import {GameAudio} from './audio.ts';
import {musicScene} from './audio-state.ts';
import {CombatEffects} from './effects.ts';

const icons:Record<string,string>={
 sound:'M3 9h5l5-4v14l-5-4H3ZM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
 silent:'M3 9h5l5-4v14l-5-4H3Zm14 0 5 6m0-6-5 6',
 sword:'M5 19 19 5m-5 0h5v5M4 15l5 5m-6 1 3-3',
 snow:'M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7M8 4l4 4 4-4M8 20l4-4 4 4',
 heal:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
 map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 key:'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM10 11v11m0-5h4m-4 4h3',
 pause:'M8 5v14M16 5v14',play:'m8 4 11 8-11 8Z',
 compass:'m15 9-2 4-4 2 2-4 4-2ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 gear:'M5 8 3 6l3-3 2 2 4-1 4 1 2-2 3 3-2 2 1 4-1 4 2 2-3 3-2-2-4 1-4-1-2 2-3-3 2-2-1-4Zm11 4a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 3v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 forward:'m6 14 6-6 6 6',back:'m6 10 6 6 6-6',left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',
 turnLeft:'M4 10h10a6 6 0 0 1 0 12M4 10l5-5m-5 5 5 5',turnRight:'M20 10H10a6 6 0 0 0 0 12m10-12-5-5m5 5-5 5',
 check:'m5 12 4 4L19 6',close:'m6 6 12 12M18 6 6 18',door:'M5 22V3l13-2v21M5 22h16M14 12v2',
};
function icon(name:string){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(icons[name]??icons.eye).split('|').map(d=>`<path d="${d}"/>`).join('')}</svg>`;}
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<main class="game">
 <section class="viewport" aria-label="First-person dungeon">
  <canvas id="dungeon" aria-label="First-person dungeon view. Move using the touch controls or keyboard."></canvas>
  <div class="vignette"></div><div class="grain"></div><div id="impact"></div>
  <nav class="viewport-tools" aria-label="Game tools"><button class="tool" id="map-button" title="Map · M" aria-label="Open map">${icon('map')}</button><button class="tool" id="sound-button" title="Mute all sound" aria-label="Mute all sound">${icon('sound')}</button><button class="tool" id="menu-button" title="Menu" aria-label="Open menu">${icon('gear')}</button></nav>
  <div class="level-caption" id="level-caption" hidden><span>DEPTH I</span><h1>${LEVEL_TITLE}</h1></div>
  <div class="compass" aria-label="Facing direction"><div id="compass-face">${icon('compass')}</div><b id="heading">E</b></div>
  <button class="minimap" id="mini-button" aria-label="Open map"><canvas id="minimap"></canvas></button>
  <div id="enemy-cards" class="enemy-cards" aria-label="Enemies and targets"></div>
  <div id="outcome" class="outcome" hidden></div>
  <div id="floaters" aria-hidden="true"></div>
  <div id="loading" class="loading"><span class="loading-symbol">◇</span><p>Opening the crypts…</p></div>
  <div id="intro" class="intro" hidden><div class="intro-symbol">◇</div><h2>The Glass<br><em>Below</em></h2><p>Light survives beneath the stone.</p><button class="primary" id="enter-button">Enter the crypts</button></div>
  <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>
 </section>
 <section class="control-deck" aria-label="Game controls">
  <div class="party" id="party"></div>
  <div class="action-panel">
   <div class="skills" id="skills"></div>
   <div class="combat-tools"><button id="pause-button" class="pause-button">${icon('pause')}<span>Pause</span><kbd>Space</kbd></button><button id="speed-button" class="speed-button" title="Combat speed" aria-label="Combat speed: normal">×1</button><button id="retreat-button" class="text-button">Retreat</button></div>
   <div class="explore-tools"><button id="interact-button" class="interact-button">${icon('eye')}<span>Interact</span><kbd>E</kbd></button></div>
  </div>
  <div class="movement" aria-label="Movement">
   <button data-move="turnLeft" title="Turn left · Left arrow" aria-label="Turn left">${icon('turnLeft')}</button><button data-move="forward" title="Move forward · W / Z / Up" aria-label="Move forward">${icon('forward')}</button><button data-move="turnRight" title="Turn right · Right arrow" aria-label="Turn right">${icon('turnRight')}</button>
   <button data-move="left" title="Step left · A / Q" aria-label="Step left">${icon('left')}</button><button data-move="back" title="Move backward · S / Down" aria-label="Move backward">${icon('back')}</button><button data-move="right" title="Step right · D" aria-label="Step right">${icon('right')}</button>
  </div>
 </section>
</main>
<dialog id="dialog"><div class="dialog-head"><h2 id="dialog-title"></h2><button class="tool" id="close-dialog" aria-label="Close">${icon('close')}</button></div><div id="dialog-body"></div></dialog><input type="file" id="import-file" accept="application/json,.json" hidden />`;

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)as T;
let game:Game=load()??createGame(),started=false,ready=false;
let camera:Camera={x:game.position.x,y:game.position.y,yaw:game.direction*Math.PI/2};
let lastTime=performance.now(),renderTime=0,lastUi=0,previousPhase=game.phase,lastFeedback=0,dirtyMap=true,lastSeen=game.seen.size,transition=0;
let renderer:DungeonRenderer;
const dialog=$<HTMLDialogElement>('dialog');
const newPlayer=game.playTime===0;
const audio=new GameAudio();
const effects=new CombatEffects($('floaters'),document.querySelector<HTMLElement>('.viewport')!);
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion=motionPreference.matches,outcomeReadyAt=0;
motionPreference.addEventListener('change',event=>{reducedMotion=event.matches;});
document.addEventListener('pointerdown',()=>{void audio.unlock();},{capture:true,passive:true});
const party=$('party'),skillPanel=$('skills');
party.innerHTML=game.heroes.map((h,i)=>`<div class="hero hero-${i}" id="hero-${i}"><div class="portrait" aria-hidden="true"><span>${i===0?'K':'L'}</span><i>${icon(i===0?'sword':'snow')}</i></div><div class="hero-info"><div class="hero-name"><strong>${h.name}</strong><span>${i===0?'VANGUARD':'FROSTWEAVER'}</span></div><div class="hero-meter hp"><i></i></div><div class="hero-values"><span class="hp-value"></span><span class="mp-value"></span></div><div class="hero-meter mp"><i></i></div></div></div>`).join('');
skillPanel.innerHTML=(Object.keys(SKILLS)as Skill[]).map((id,i)=>{const s=SKILLS[id];return `<button class="skill skill-${id}" data-skill="${id}" title="${s.description}" aria-label="${s.name} : ${s.description}"><div class="skill-top">${icon(['sword','snow','heal'][i])}<kbd>${i+1}</kbd></div><strong>${s.name}</strong><span>${s.cost} MP · ${game.heroes[s.hero].name}</span><div class="skill-cooldown"></div><b class="cooldown-label"></b><i class="queued">${icon('check')}</i></button>`;}).join('');
let noticeCaption:TimedCaption|null=null,levelCaption:TimedCaption|null=null,lastMessage=game.message;
function announceLevel(){levelCaption=caption(LEVEL_TITLE,performance.now()/1000,3,2);}
function notify(text:string){noticeCaption=text?caption(text,performance.now()/1000):null;}
function updateCaptions(now:number){
  const notice=$('notice'),level=$('level-caption'),n=captionOpacity(noticeCaption,now),l=captionOpacity(levelCaption,now);
  notice.hidden=n<=0||!started||!!game.battle?.paused;notice.style.opacity=String(n);
  notice.textContent=noticeCaption?.text??'';
  level.hidden=l<=0||!started||game.phase!=='explore';level.style.opacity=String(l);
}
function persist(){if(!save(game))notify('Saving is unavailable. Export your expedition from the menu.');}
function ui(){
  const fighting=game.phase==='combat',b=game.battle;
  app.dataset.phase=game.phase;app.dataset.paused=String(!!b?.paused);app.dataset.started=String(started);
  audio.setScene(musicScene(game,started));audio.setPaused(!!b?.paused);
  $('sound-button').innerHTML=icon(audio.settings.muted?'silent':'sound');$('sound-button').setAttribute('aria-label',audio.settings.muted?'Enable sound':'Mute all sound');$('sound-button').title=audio.settings.muted?'Enable sound':'Mute all sound';
  $('heading').textContent=CARDINALS[game.direction];$('compass-face').style.transform=`rotate(${game.direction*90+45}deg)`;
  if(game.message!==lastMessage){lastMessage=game.message;notify(game.message);}
  for(let i=0;i<2;i++){
    const h=game.heroes[i],card=$(`hero-${i}`);card.querySelector<HTMLElement>('.hp i')!.style.width=`${h.hp/h.maxHp*100}%`;card.querySelector<HTMLElement>('.mp i')!.style.width=`${h.mp/h.maxMp*100}%`;
    card.querySelector('.hp-value')!.textContent=`${Math.ceil(h.hp)} / ${h.maxHp} HP`;card.querySelector('.mp-value')!.textContent=`${Math.floor(h.mp)} / ${h.maxMp} MP`;card.classList.toggle('fallen',h.hp<=0);
  }
  for(const id of Object.keys(SKILLS)as Skill[]){
    const button=document.querySelector<HTMLButtonElement>(`[data-skill="${id}"]`)!,s=SKILLS[id],cd=b?.cooldowns[id]??0;
    button.disabled=!canUse(game,id,!b?.paused);
    button.classList.toggle('is-queued',!!b?.queue.includes(id));button.style.setProperty('--cooldown',`${cd/s.cooldown*100}%`);button.querySelector('.cooldown-label')!.textContent=cd>0?`${cd.toFixed(1)} s`:'';
  }
  $('pause-button').innerHTML=`${icon(b?.paused?'play':'pause')}<span>${b?.paused?'Resume':'Pause'}</span><kbd>Space</kbd>`;
  $('speed-button').textContent=`×${b?.speed??1}`;$('speed-button').setAttribute('aria-label',`Combat speed: ${b?.speed===2?'double':'normal'}`);
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-move],#interact-button'))button.disabled=game.phase!=='explore';
  updateEnemies();
  if(fighting){const stage=$('dungeon').getBoundingClientRect(),tools=document.querySelector<HTMLElement>('.viewport-tools')!.getBoundingClientRect(),dock=$('enemy-cards').getBoundingClientRect();const insets={top:Math.max(20,tools.bottom-stage.top+12),bottom:Math.max(20,stage.bottom-dock.top+12)};renderer?.setCombatInsets(insets);effects.setCombatInsets(insets);}
  if(game.seen.size!==lastSeen){lastSeen=game.seen.size;dirtyMap=true;}
  if(dirtyMap){drawMap($<HTMLCanvasElement>('minimap'),game);let total=0,seen=0;MAP.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell==='.'){total++;if(game.seen.has(`${x},${y}`))seen++;}}));$('mini-button').setAttribute('aria-label',`Open map · ${Math.round(seen/total*100)}% explored`);dirtyMap=false;}
  if(game.phase!==previousPhase){
    if(game.phase==='combat')persist();
    if(game.phase==='victory'||game.phase==='complete')persist();
    if(game.phase==='victory'){outcomeReadyAt=performance.now()+480;audio.play('reward');}else if(game.phase==='defeat')outcomeReadyAt=performance.now()+350;else outcomeReadyAt=0;
    previousPhase=game.phase;updateOutcome();
  }
  if($('outcome').hidden&&['victory','defeat','complete'].includes(game.phase)&&performance.now()>=outcomeReadyAt)updateOutcome();
}
let enemyMarkup='';
function updateEnemies(){
  const b=game.battle,container=$('enemy-cards');
  if(game.phase!=='combat'||!b){if(enemyMarkup){container.innerHTML='';enemyMarkup='';}return;}
  const e=visibleEnemy(b),key=`${b.encounter}:${e.id}`,d=CREATURES[e.kind];
  if(enemyMarkup!==key){
    container.innerHTML=`<button class="enemy-card selected" data-target="${e.id}" aria-pressed="true"><div><span class="enemy-name"></span><span class="wave-count"></span><span class="target-label"></span></div><div class="enemy-hp"><i></i></div><p></p><div class="intent-meter"><i></i></div></button>`;
    enemyMarkup=key;
  }
  const card=container.firstElementChild as HTMLButtonElement;
  card.className=`enemy-card selected ${e.windup>0?'danger':''} ${e.hp<=0?'dead':''}`;card.disabled=e.hp<=0;
  const round=b.enemies.length>1?`Opponent ${b.wave+1} of ${b.enemies.length}. `:'';
  card.setAttribute('aria-label',`${round}${e.name}: ${Math.ceil(e.hp)} of ${e.maxHp} HP`);
  card.querySelector('.enemy-name')!.textContent=e.name;
  const counter=card.querySelector<HTMLElement>('.wave-count')!;counter.hidden=b.enemies.length===1;counter.textContent=`${b.wave+1} / ${b.enemies.length}`;
  card.querySelector('.target-label')!.textContent=`${Math.ceil(e.hp)} / ${e.maxHp}`;
  card.querySelector<HTMLElement>('.enemy-hp i')!.style.width=`${e.hp/e.maxHp*100}%`;
  card.querySelector('p')!.textContent=e.hp<=0?'Next opponent approaching':e.stunned>0?'Frozen':e.windup>0?`${d.skill} · ${e.kind==='sentinel'?'Party':game.heroes[e.target].name}`:'';
  card.querySelector<HTMLElement>('.intent-meter i')!.style.width=`${e.windup>0?(1-e.windup/d.windup)*100:e.clock/d.period*100}%`;

}
function updateOutcome(){
  const out=$('outcome');out.hidden=!['victory','defeat','complete'].includes(game.phase);
  if(out.hidden)return;if(performance.now()<outcomeReadyAt){out.hidden=true;return;}
  const complete=game.phase==='complete',lost=game.phase==='defeat';
  out.innerHTML=`<div class="outcome-symbol">${icon(lost?'compass':'check')}</div><span class="overline">${complete?'THE GLASS CRYPTS':lost?'EXPEDITION ENDED':'PASSAGE CLEARED'}</span><h2>${complete?'Beyond the threshold':lost?'The light fades':'Victory'}</h2><p>${game.message}</p>${complete?`<div class="run-stats"><b>${game.gold}<span>shards</span></b><b>${game.cleared.size}<span>battles won</span></b><b>${Math.floor(game.playTime/60)}:${String(Math.floor(game.playTime%60)).padStart(2,'0')}<span>play time</span></b></div>`:''}<button class="primary" data-outcome="${lost?'retry':complete?'restart':'continue'}">${lost?'Resume checkpoint':complete?'New expedition':'Continue'}</button>`;
}
function act(action:string){
  if(!ready||!started||dialog.open||transition>.03||game.phase!=='explore')return;
  const before=game.phase,position={...game.position},hadKey=game.key,gateWasOpen=game.gateOpen,shrineWasUsed=game.shrineUsed;
  if(action==='turnLeft')turn(game,-1);else if(action==='turnRight')turn(game,1);else if(action==='interact')interact(game);else move(game,action==='forward'?0:action==='back'?2:action==='left'?-1:1);
  if(game.key&&!hadKey)audio.play('reward');else if(game.gateOpen&&!gateWasOpen)audio.play('gate');else if(game.shrineUsed&&!shrineWasUsed)audio.play('heal');else if(position.x!==game.position.x||position.y!==game.position.y)audio.play('step');
  const angle=game.direction*Math.PI/2;let delta=angle-camera.yaw;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;camera.yaw=angle-delta;
  transition=.2;dirtyMap=true;if(game.phase==='explore'||before!==game.phase)persist();ui();
}
function restart(){effects.clear();outcomeReadyAt=0;game=createGame();camera={x:game.position.x,y:game.position.y,yaw:0};previousPhase='explore';lastFeedback=0;enemyMarkup='';$('enemy-cards').innerHTML='';dirtyMap=true;persist();announceLevel();updateOutcome();ui();}
function showDialog(title:string,body:string){
  if(game.phase==='combat'&&game.battle&&!game.battle.paused)togglePause(game);
  $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;dialog.showModal();ui();
}
function openMap(){
  showDialog('The Glass Crypts',`<p class="dialog-intro">${objective(game)}</p><canvas id="full-map" aria-label="Map of discovered areas"></canvas><div class="map-legend"><span><i class="legend-player"></i>Party</span><span><i class="legend-enemy"></i>Enemy</span><span><i class="legend-key"></i>Chest</span><span><i class="legend-source"></i>Spring</span></div><p class="fine">${game.gold} shards · ${game.cleared.size} / ${ENCOUNTERS.length} encounters cleared${game.key?' · Copper key':''}</p>`);
  requestAnimationFrame(()=>drawMap($<HTMLCanvasElement>('full-map'),game,true));
}
function openHelp(){showDialog('Field guide',`<div class="guide"><h3>Explore</h3><p>Move one tile at a time and turn through 90°. Creatures are visible in the corridors. Combat begins when one is directly in front of you.</p><p><b>Keyboard:</b> W / Z or ↑ to move forward, S or ↓ to move backward, ← / → to turn, A / Q and D to step sideways. E to interact, M for the map. All actions also have touch controls.</p><h3>Fight</h3><p>Kael and Lys attack automatically. Use the three skills with their buttons or keys <b>1, 2 and 3</b>. Each opponent fights at full size. Reinforcements arrive one at a time; the counter shows your progress through the encounter.</p><p><b>Space pauses combat.</b> Queue one skill per hero while paused. A new order replaces that hero’s previous order. MP is spent only when the action executes after resuming. Skills are separated by 0.65 seconds. Selecting a queued skill again cancels it.</p><h3>Read enemy intentions</h3><p>An amber enemy card signals an incoming attack. Fracture and Frost Shard interrupt it. The Warden can strike the entire party.</p><h3>Survive</h3><p>Each victory restores 18 HP and 10 MP. The spring fully restores the party once. Retreat returns you to the entrance with your current health. After defeat, you can resume the last saved checkpoint.</p><p class="fine">Music and sound effects can be adjusted in the menu.</p></div>`);}
function openMenu(){showDialog('Expedition',`<div class="menu-stack"><p class="dialog-intro">${objective(game)}</p><p class="expedition-stats">${game.gold} shards · ${game.cleared.size} / ${ENCOUNTERS.length} encounters cleared</p><div class="sound-settings"><label class="sound-toggle">Mute all sound<input id="mute-setting" type="checkbox" ${audio.settings.muted?'checked':''}></label><label class="sound-slider">Music<input id="music-setting" type="range" min="0" max="100" value="${Math.round(audio.settings.music*100)}"></label><label class="sound-slider">Sound effects<input id="effects-setting" type="range" min="0" max="100" value="${Math.round(audio.settings.effects*100)}"></label></div><button class="secondary" data-menu="help">Field guide</button>${game.phase==='combat'?'<button class="secondary" data-menu="ask-retreat">Retreat to the entrance</button>':''}<button class="secondary" data-menu="export">Export save</button><button class="secondary" data-menu="import">Import save</button><button class="secondary" data-menu="install" id="install-button" hidden>Install game</button><button class="secondary" data-menu="update" id="update-button" hidden>Apply update</button><button class="danger-button" data-menu="new">New expedition</button><span class="fine">${GAME_TITLE} · Prototype 0.5</span></div>`);if(installPrompt)$('install-button').hidden=false;if(waitingWorker)$('update-button').hidden=false;}

app.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
  if(button.dataset.move){act(button.dataset.move);return;}
  if(button.dataset.skill){useSkill(game,button.dataset.skill as Skill);ui();return;}
  if(button.dataset.target){selectTarget(game,Number(button.dataset.target));ui();return;}
  const outcome=button.dataset.outcome;
  if(outcome==='continue'){effects.clear();continueAfterBattle(game);enemyMarkup='';$('enemy-cards').innerHTML='';dirtyMap=true;persist();updateOutcome();ui();return;}
  if(outcome==='retry'){effects.clear();outcomeReadyAt=0;game=load()??createGame();game.phase='explore';game.battle=null;camera={x:game.position.x,y:game.position.y,yaw:game.direction*Math.PI/2};previousPhase='explore';enemyMarkup='';lastFeedback=0;dirtyMap=true;updateOutcome();ui();return;}
  if(outcome==='restart'){showDialog('New expedition',`<p class="dialog-intro">This will replace your current progress.</p><button class="primary" data-menu="confirm-new">Restart expedition</button>`);return;}
  if(button.id==='enter-button'){started=true;$('intro').hidden=true;lastTime=performance.now();announceLevel();ui();return;}
  if(button.id==='pause-button'){togglePause(game);ui();}
  if(button.id==='speed-button'&&game.battle){game.battle.speed=game.battle.speed===1?2:1;ui();}
  if(button.id==='retreat-button'){showDialog('Retreat',`<p class="dialog-intro">Return to the entrance with your current HP and MP? Undefeated enemies will recover.</p><button class="primary" data-menu="retreat">Return to the entrance</button>`);}
  if(button.id==='interact-button')act('interact');
  if(button.id==='map-button'||button.id==='mini-button')openMap();
  if(button.id==='sound-button'){audio.setSettings({muted:!audio.settings.muted});void audio.unlock();ui();}if(button.id==='menu-button')openMenu();
});
$('close-dialog').addEventListener('click',()=>dialog.close());
$('dialog-body').addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(input.id==='mute-setting')audio.setSettings({muted:input.checked});if(input.id==='music-setting')audio.setSettings({music:Number(input.value)/100});if(input.id==='effects-setting')audio.setSettings({effects:Number(input.value)/100});ui();});
$('dialog-body').addEventListener('click',async event=>{
  const action=(event.target as Element).closest<HTMLElement>('[data-menu]')?.dataset.menu;if(!action)return;
  if(action==='export'){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([serialize(game)],{type:'application/json'}));a.href=url;a.download='the-glass-below-save.json';a.click();URL.revokeObjectURL(url);}
  if(action==='ask-retreat')showDialog('Retreat',`<p class="dialog-intro">Return to the entrance with your current HP and MP? Undefeated enemies will recover.</p><button class="primary" data-menu="retreat">Return to the entrance</button>`);
  if(action==='help')openHelp();
  if(action==='import')$<HTMLInputElement>('import-file').click();
  if(action==='new')showDialog('New expedition',`<p class="dialog-intro">This will replace your current progress. You can export a save from the menu first.</p><button class="primary" data-menu="confirm-new">Start new expedition</button>`);
  if(action==='confirm-new'){restart();dialog.close();}
  if(action==='retreat'){retreat(game);camera={x:game.position.x,y:game.position.y,yaw:0};dirtyMap=true;persist();dialog.close();ui();}
  if(action==='update'&&waitingWorker){persist();applyingUpdate=true;waitingWorker.postMessage({type:'APPLY_UPDATE'});}
  if(action==='install'&&installPrompt){await installPrompt.prompt();installPrompt=null;$('install-button').hidden=true;}
});
$('import-file').addEventListener('change',async event=>{
  const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;if(file.size>50000){showDialog('Import failed','<p class="dialog-intro">This file is too large.</p>');input.value='';return;}
  const imported=deserialize(await file.text());input.value='';
  if(!imported){showDialog('Invalid save','<p class="dialog-intro">This file is not a compatible save. Your current expedition has been preserved.</p>');return;}
  showDialog('Import expedition',`<p class="dialog-intro">Replace your current expedition with this save? ${imported.cleared.size} encounters cleared, ${imported.gold} shards.</p><button class="primary" id="confirm-import">Replace expedition</button>`);
  $('confirm-import').addEventListener('click',()=>{game=imported;camera={x:game.position.x,y:game.position.y,yaw:game.direction*Math.PI/2};previousPhase=game.phase;lastFeedback=0;enemyMarkup='';$('enemy-cards').innerHTML='';dirtyMap=true;persist();dialog.close();updateOutcome();ui();});
});
document.addEventListener('keydown',event=>{
  if(!started||!ready||dialog.open||event.ctrlKey||event.metaKey||event.altKey)return;
  void audio.unlock();
  const key=event.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(key))event.preventDefault();
  if(event.repeat&&[' ','1','2','3','m'].includes(key))return;
  if(key===' '){togglePause(game);ui();return;}
  if(key==='m'){openMap();return;}
  if(['1','2','3'].includes(key)){useSkill(game,(['fracture','frost','heal']as Skill[])[Number(key)-1]);ui();return;}
  if(key==='tab'&&game.phase==='combat'){const target=livingTarget(game);if(target)selectTarget(game,target.id);ui();return;}
  const actions:Record<string,string>={arrowup:'forward',z:'forward',w:'forward',arrowdown:'back',s:'back',arrowleft:'turnLeft',arrowright:'turnRight',q:'left',a:'left',d:'right',e:'interact'};
  if(actions[key]){event.preventDefault();act(actions[key]);}
});
document.addEventListener('visibilitychange',()=>{audio.setHidden(document.hidden);if(document.hidden){if(game.phase==='combat'&&game.battle&&!game.battle.paused)togglePause(game);if(game.phase==='explore')persist();ui();}lastTime=performance.now();});
window.addEventListener('resize',()=>{dirtyMap=true;if(dialog.open&&document.getElementById('full-map'))drawMap($<HTMLCanvasElement>('full-map'),game,true);});
let installPrompt:(Event&{prompt:()=>Promise<void>})|null=null,waitingWorker:ServiceWorker|null=null,applyingUpdate=false;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event as typeof installPrompt;});
if('serviceWorker'in navigator&&import.meta.env.PROD){
  navigator.serviceWorker.register('./sw.js').then(registration=>{waitingWorker=registration.waiting;registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){waitingWorker=worker;game.message='An update is available in the menu.';}});});}).catch(()=>{notify('Offline installation is unavailable.');});
  let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing||!applyingUpdate)return;refreshing=true;location.reload();});
}
function feedback(){
  for(const f of game.feedback){if(f.id<=lastFeedback)continue;lastFeedback=f.id;
    if(f.kind==='hurt'){$('impact').classList.remove('flash');void $('impact').offsetWidth;$('impact').classList.add('flash');const hero=$(`hero-${f.hero}`);hero.classList.remove('hit');void hero.offsetWidth;hero.classList.add('hit');}
    if(f.kind==='heal'&&f.hero!==undefined){const hero=$(`hero-${f.hero}`);hero.classList.remove('restored');void hero.offsetWidth;hero.classList.add('restored');}
    audio.play(effects.spawn(f,game,camera));
  }
}
function frame(now:number){
  const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;
  if(started&&!dialog.open&&!document.hidden){tick(game,dt);if(!game.battle?.paused)renderTime+=dt;transition=Math.max(0,transition-dt);}
  const blend=1-Math.exp(-dt*17);camera.x+=(game.position.x-camera.x)*blend;camera.y+=(game.position.y-camera.y)*blend;
  const targetYaw=game.direction*Math.PI/2;let delta=targetYaw-camera.yaw;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;camera.yaw+=delta*blend;
  renderer.render(game,camera,renderTime);feedback();effects.tick(started&&!document.hidden&&!dialog.open&&!game.battle?.paused?dt*(game.phase==='combat'?(game.battle?.speed??1):1):0,reducedMotion);updateCaptions(now/1000);
  if(now-lastUi>80){ui();lastUi=now;}
  if(renderer.error){showDialog('Graphics interrupted',`<p class="dialog-intro">${renderer.error}</p>`);return;}
  requestAnimationFrame(frame);
}
try{
  renderer=new DungeonRenderer($<HTMLCanvasElement>('dungeon'));
  renderer.ready.then(()=>{ready=true;$('loading').hidden=true;started=!newPlayer;$('intro').hidden=!newPlayer;if(started)announceLevel();updateOutcome();ui();requestAnimationFrame(frame);}).catch(()=>{$('loading').innerHTML='<p>The creature artwork could not be loaded. Check your connection and reload.</p>';});
}catch(error){$('loading').innerHTML=`<p>${String(error)}</p>`;}
ui();
