import './style.css';
import {createGame,tick,move,turn,interact,SKILLS,CREATURES,togglePause,useSkill,selectTarget,continueAfterBattle,retreat,livingTarget} from './engine.ts';
import type {Game,Skill} from './engine.ts';
import {CARDINALS,ENCOUNTERS,MAP} from './world.ts';
import {DungeonRenderer,drawMap} from './renderer.ts';
import type {Camera} from './renderer.ts';
import {load,save,serialize,deserialize} from './save.ts';

const icons:Record<string,string>={
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
 <header class="topbar">
  <div class="brand-mark">${icon('door')}</div><div class="brand"><h1>Hollow Depths</h1><span>LES CRYPTES DE VERRE</span></div>
  <div class="chapter"><span class="overline">EXPÉDITION I</span><strong>Le seuil oublié</strong></div>
  <nav aria-label="Outils"><button class="tool" id="map-button" title="Carte · M" aria-label="Ouvrir la carte">${icon('map')}</button><button class="tool" id="help-button" title="Guide" aria-label="Ouvrir le guide">${icon('help')}</button><button class="tool" id="menu-button" title="Menu" aria-label="Ouvrir le menu">${icon('gear')}</button></nav>
 </header>
 <section class="viewport" aria-label="Labyrinthe en trois dimensions">
  <canvas id="dungeon" aria-label="Vue subjective du labyrinthe. Déplacez-vous avec les boutons ou les flèches du clavier."></canvas>
  <div class="vignette"></div><div class="grain"></div><div id="impact"></div>
  <div class="location"><span class="overline">NIVEAU 01 · LES CRYPTES</span><h2 id="location-name">Galeries du silence</h2><span class="coordinates" id="coordinates"></span></div>
  <div class="compass"><span>N</span><div id="compass-face">${icon('compass')}</div><b id="heading">EST</b></div>
  <button class="minimap" id="mini-button" aria-label="Agrandir la carte"><canvas id="minimap"></canvas><span>${icon('map')}<b id="discovered">Territoire inconnu</b><kbd>M</kbd></span></button>
  <div class="objective"><span class="overline">VOTRE OBJECTIF</span><p id="objective">Trouver la clé de cuivre</p></div>
  <div id="enemy-cards" class="enemy-cards" aria-label="Ennemis et cibles"></div>
  <div id="pause-banner" class="pause-banner" hidden><span class="overline">LE TEMPS VOUS APPARTIENT</span><h2>Pause tactique</h2><p>Choisissez votre cible et préparez vos actions.</p><span id="queue-label">Aucun ordre préparé</span></div>
  <div id="outcome" class="outcome" hidden></div>
  <div id="floaters" aria-hidden="true"></div>
  <div id="loading" class="loading"><span class="loading-symbol">◇</span><p>Ouverture des cryptes…</p></div>
  <div id="intro" class="intro" hidden><div class="intro-symbol">◇</div><span class="overline">UNE EXPÉDITION DANS L’INCONNU</span><h2>Les Cryptes<br><em>de Verre</em></h2><p>Sous la pierre, une lueur persiste.<br>Retrouvez la clé. Franchissez la grille.<br>Découvrez ce qui veille encore.</p><button class="primary" id="enter-button">Entrer dans les cryptes</button><small>Exploration 3D · Combat automatique · Pause tactique</small></div>
  <div id="notice" class="notice" role="status" aria-live="polite"></div>
 </section>
 <section class="control-deck" aria-label="Commandes du jeu">
  <div class="party" id="party"></div>
  <div class="action-panel">
   <div class="action-heading"><span class="overline" id="mode-label">EXPLORATION</span><span id="mode-detail">Avancez. Observez. Choisissez votre chemin.</span></div>
   <div class="skills" id="skills"></div>
   <div class="combat-tools"><button id="pause-button" class="pause-button">${icon('pause')}<span>Pause tactique</span><kbd>Espace</kbd></button><button id="speed-button" class="speed-button" title="Vitesse du combat">×1</button><button id="retreat-button" class="text-button">Se replier</button></div>
   <div class="explore-tools"><button id="interact-button" class="interact-button">${icon('eye')}<span>Interagir</span><kbd>E</kbd></button><span class="auto-save" id="save-state">Sauvegarde automatique</span></div>
  </div>
  <div class="movement" aria-label="Déplacements">
   <button data-move="turnLeft" title="Pivoter à gauche · Flèche gauche" aria-label="Pivoter à gauche">${icon('turnLeft')}</button><button data-move="forward" title="Avancer · Z ou W ou Flèche haut" aria-label="Avancer">${icon('forward')}</button><button data-move="turnRight" title="Pivoter à droite · Flèche droite" aria-label="Pivoter à droite">${icon('turnRight')}</button>
   <button data-move="left" title="Pas à gauche · Q ou A" aria-label="Pas à gauche">${icon('left')}</button><button data-move="back" title="Reculer · S ou Flèche bas" aria-label="Reculer">${icon('back')}</button><button data-move="right" title="Pas à droite · D" aria-label="Pas à droite">${icon('right')}</button>
   <span>CLAVIER OU COMMANDES TACTILES</span>
  </div>
 </section>
 <footer class="statusbar"><span><i></i><b id="status-text">Expédition en cours</b></span><span id="resources">0 éclat · 0 / 6 passages libérés</span><span class="version">PROTOTYPE 0.1</span></footer>
</main>
<dialog id="dialog"><div class="dialog-head"><h2 id="dialog-title"></h2><button class="tool" id="close-dialog" aria-label="Fermer">${icon('close')}</button></div><div id="dialog-body"></div></dialog><input type="file" id="import-file" accept="application/json,.json" hidden />`;

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)as T;
let game:Game=load()??createGame(),started=false,ready=false;
let camera:Camera={x:game.position.x,y:game.position.y,yaw:game.direction*Math.PI/2};
let lastTime=performance.now(),renderTime=0,lastUi=0,previousPhase=game.phase,lastFeedback=0,dirtyMap=true,lastSeen=game.seen.size,transition=0;
let renderer:DungeonRenderer;
const dialog=$<HTMLDialogElement>('dialog');
const newPlayer=game.playTime===0;
const party=$('party'),skillPanel=$('skills');
party.innerHTML=game.heroes.map((h,i)=>`<div class="hero hero-${i}" id="hero-${i}"><div class="portrait" aria-hidden="true"><span>${i===0?'K':'L'}</span><i>${icon(i===0?'sword':'snow')}</i></div><div class="hero-info"><div class="hero-name"><strong>${h.name}</strong><span>${i===0?'LAME DU SEUIL':'TISSEUSE DE GIVRE'}</span></div><div class="hero-meter hp"><i></i></div><div class="hero-values"><span class="hp-value"></span><span class="mp-value"></span></div><div class="hero-meter mp"><i></i></div></div></div>`).join('');
skillPanel.innerHTML=(Object.keys(SKILLS)as Skill[]).map((id,i)=>{const s=SKILLS[id];return `<button class="skill skill-${id}" data-skill="${id}" title="${s.description}" aria-label="${s.name} : ${s.description}"><div class="skill-top">${icon(['sword','snow','heal'][i])}<kbd>${i+1}</kbd></div><strong>${s.name}</strong><span>${s.cost} PM · ${game.heroes[s.hero].name}</span><div class="skill-cooldown"></div><b class="cooldown-label"></b><i class="queued">${icon('check')}</i></button>`;}).join('');
function persist(){if(!save(game))$('save-state').textContent='Sauvegarde indisponible : exportez votre partie';}
function ui(){
  const fighting=game.phase==='combat',b=game.battle;
  app.dataset.phase=game.phase;app.dataset.paused=String(!!b?.paused);
  $('coordinates').textContent=`${String(game.position.x).padStart(2,'0')} : ${String(game.position.y).padStart(2,'0')} · Sous le sanctuaire`;
  $('heading').textContent=CARDINALS[game.direction].toUpperCase();$('compass-face').style.transform=`rotate(${game.direction*90+45}deg)`;
  $('location-name').textContent=game.position.y>8?'L’antichambre du Gardien':game.position.y>4?'Les galeries profondes':'Galeries du silence';
  $('objective').textContent=game.cleared.has('guardian')?'Rejoindre la sortie':game.gateOpen?'Vaincre le Gardien sans visage':game.key?'Ouvrir la grille à l’est':'Trouver la clé de cuivre';
  $('resources').textContent=`${game.gold} éclats · ${game.cleared.size} / ${ENCOUNTERS.length} passages libérés`;
  $('status-text').textContent=fighting?b!.paused?'Pause tactique':'Combat en cours':game.phase==='complete'?'Expédition accomplie':'Expédition en cours';
  $('notice').textContent=game.message;
  $('mode-label').textContent=fighting?'COMBAT · ATTAQUES AUTOMATIQUES':'EXPLORATION';
  $('mode-detail').textContent=fighting?'Les compétences restent entre vos mains.':'Avancez. Observez. Choisissez votre chemin.';
  for(let i=0;i<2;i++){
    const h=game.heroes[i],card=$(`hero-${i}`);card.querySelector<HTMLElement>('.hp i')!.style.width=`${h.hp/h.maxHp*100}%`;card.querySelector<HTMLElement>('.mp i')!.style.width=`${h.mp/h.maxMp*100}%`;
    card.querySelector('.hp-value')!.textContent=`${Math.ceil(h.hp)} / ${h.maxHp} PV`;card.querySelector('.mp-value')!.textContent=`${Math.floor(h.mp)} / ${h.maxMp} PM`;card.classList.toggle('fallen',h.hp<=0);
  }
  for(const id of Object.keys(SKILLS)as Skill[]){
    const button=document.querySelector<HTMLButtonElement>(`[data-skill="${id}"]`)!,s=SKILLS[id],cd=b?.cooldowns[id]??0;
    button.disabled=!fighting||game.heroes[s.hero].hp<=0||game.heroes[s.hero].mp<s.cost||cd>0||(!b!.paused&&b!.globalCooldown>0);
    button.classList.toggle('is-queued',!!b?.queue.includes(id));button.style.setProperty('--cooldown',`${cd/s.cooldown*100}%`);button.querySelector('.cooldown-label')!.textContent=cd>0?`${cd.toFixed(1)} s`:'';
  }
  $('pause-button').innerHTML=`${icon(b?.paused?'play':'pause')}<span>${b?.paused?'Reprendre':'Pause tactique'}</span><kbd>Espace</kbd>`;
  $('pause-banner').hidden=!fighting||!b?.paused;
  $('queue-label').textContent=b?.queue.length?`À la reprise : ${b.queue.map(s=>SKILLS[s].name).join(' · ')}`:'Aucun ordre préparé';
  $('speed-button').textContent=`×${b?.speed??1}`;
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-move],#interact-button'))button.disabled=game.phase!=='explore';
  updateEnemies();
  if(game.seen.size!==lastSeen){lastSeen=game.seen.size;dirtyMap=true;}
  if(dirtyMap){drawMap($<HTMLCanvasElement>('minimap'),game);let total=0,seen=0;MAP.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell==='.'){total++;if(game.seen.has(`${x},${y}`))seen++;}}));$('discovered').textContent=`${Math.round(seen/total*100)} % explorés`;dirtyMap=false;}
  if(game.phase!==previousPhase){
    if(game.phase==='combat')persist();
    if(game.phase==='victory'||game.phase==='complete')persist();
    previousPhase=game.phase;updateOutcome();
  }
}
let enemyMarkup='';
function updateEnemies(){
  const b=game.battle,container=$('enemy-cards');
  if(game.phase!=='combat'||!b){if(enemyMarkup){container.innerHTML='';enemyMarkup='';}return;}
  const markup=b.enemies.map(e=>{
    const d=CREATURES[e.kind],alive=e.hp>0;const intent=e.stunned>0?'Immobilisé':e.windup>0?`${d.skill} · ${e.kind==='sentinel'?'Groupe':game.heroes[e.target].name}`:'Prépare son prochain mouvement';
    const progress=e.windup>0?(1-e.windup/d.windup)*100:e.clock/d.period*100;
    return `<button class="enemy-card ${e.id===b.target?'selected':''} ${e.windup>0?'danger':''} ${alive?'':'dead'}" data-target="${e.id}" ${alive?'':'disabled'} aria-label="Cibler ${e.name}" aria-pressed="${e.id===b.target}"><div><span class="enemy-name">${e.name}</span><span class="target-label">${e.id===b.target?'CIBLE':'CIBLER'}</span></div><div class="enemy-hp"><i style="width:${e.hp/e.maxHp*100}%"></i></div><div class="enemy-meta"><span>${Math.ceil(e.hp)} / ${e.maxHp} PV</span><span>${e.kind==='sentinel'?'GARDIEN':'HOSTILE'}</span></div><p>${alive?intent:'Vaincu'}</p><div class="intent-meter"><i style="width:${progress}%"></i></div></button>`;
  }).join('');
  // Keep target buttons stable while their clocks advance, preserving focus and touch.
  if(container.children.length!==b.enemies.length){container.innerHTML=markup;enemyMarkup=markup;return;}
  b.enemies.forEach((e,i)=>{
    const card=container.children[i]as HTMLButtonElement,d=CREATURES[e.kind];card.className=`enemy-card ${e.id===b.target?'selected':''} ${e.windup>0?'danger':''} ${e.hp<=0?'dead':''}`;card.disabled=e.hp<=0;card.setAttribute('aria-pressed',String(e.id===b.target));card.querySelector('.target-label')!.textContent=e.id===b.target?'CIBLE':'CIBLER';card.querySelector<HTMLElement>('.enemy-hp i')!.style.width=`${e.hp/e.maxHp*100}%`;card.querySelector('.enemy-meta span')!.textContent=`${Math.ceil(e.hp)} / ${e.maxHp} PV`;card.querySelector('p')!.textContent=e.hp<=0?'Vaincu':e.stunned>0?'Immobilisé':e.windup>0?`${d.skill} · ${e.kind==='sentinel'?'Groupe':game.heroes[e.target].name}`:'Prépare son prochain mouvement';card.querySelector<HTMLElement>('.intent-meter i')!.style.width=`${e.windup>0?(1-e.windup/d.windup)*100:e.clock/d.period*100}%`;
  });
}
function updateOutcome(){
  const out=$('outcome');out.hidden=!['victory','defeat','complete'].includes(game.phase);
  if(out.hidden)return;
  const complete=game.phase==='complete',lost=game.phase==='defeat';
  out.innerHTML=`<div class="outcome-symbol">${icon(lost?'compass':'check')}</div><span class="overline">${complete?'LES CRYPTES DE VERRE':lost?'EXPÉDITION INTERROMPUE':'LE PASSAGE EST LIBRE'}</span><h2>${complete?'Le seuil est franchi':lost?'La lumière s’éteint':'Victoire'}</h2><p>${game.message}</p>${complete?`<div class="run-stats"><b>${game.gold}<span>éclats</span></b><b>${game.cleared.size}<span>combats remportés</span></b><b>${Math.floor(game.playTime/60)}:${String(Math.floor(game.playTime%60)).padStart(2,'0')}<span>temps de jeu</span></b></div>`:''}<button class="primary" data-outcome="${lost?'retry':complete?'restart':'continue'}">${lost?'Reprendre à l’entrée':complete?'Nouvelle expédition':'Poursuivre l’exploration'}</button>`;
}
function act(action:string){
  if(!ready||!started||dialog.open||transition>.03||game.phase!=='explore')return;
  const before=game.phase;
  if(action==='turnLeft')turn(game,-1);else if(action==='turnRight')turn(game,1);else if(action==='interact')interact(game);else move(game,action==='forward'?0:action==='back'?2:action==='left'?-1:1);
  const angle=game.direction*Math.PI/2;let delta=angle-camera.yaw;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;camera.yaw=angle-delta;
  transition=.2;dirtyMap=true;if(game.phase==='explore'||before!==game.phase)persist();ui();
}
function restart(){game=createGame();camera={x:game.position.x,y:game.position.y,yaw:0};previousPhase='explore';lastFeedback=0;enemyMarkup='';$('enemy-cards').innerHTML='';dirtyMap=true;persist();updateOutcome();ui();}
function showDialog(title:string,body:string){
  if(game.phase==='combat'&&game.battle&&!game.battle.paused)togglePause(game);
  $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;dialog.showModal();ui();
}
function openMap(){
  showDialog('Carte des cryptes',`<p class="dialog-intro">Seuls les lieux aperçus sont révélés.</p><canvas id="full-map" aria-label="Carte des zones découvertes"></canvas><div class="map-legend"><span><i class="legend-player"></i>Groupe</span><span><i class="legend-enemy"></i>Créature</span><span><i class="legend-key"></i>Coffre / clé</span><span><i class="legend-source"></i>Source</span></div><p class="fine">Objectif : ${$('objective').textContent}</p>`);
  requestAnimationFrame(()=>drawMap($<HTMLCanvasElement>('full-map'),game,true));
}
function openHelp(){showDialog('Guide de l’expédition',`<div class="guide"><h3>Explorer</h3><p>Avancez d’une case à l’autre et pivotez à 90°. Les créatures sont visibles dans les couloirs. Le combat commence lorsqu’elles se trouvent juste devant vous.</p><p><b>Clavier :</b> Z / W ou ↑ pour avancer, S ou ↓ pour reculer, ← / → pour pivoter, Q / A et D pour les pas de côté. E pour interagir, M pour la carte.</p><h3>Combattre</h3><p>Kaël et Lys attaquent automatiquement. Utilisez les trois compétences avec les boutons ou les touches <b>1, 2 et 3</b>. Touchez une fiche ennemie pour choisir la cible. Tab change de cible.</p><p><b>Espace suspend le temps.</b> Pendant la pause, préparez une compétence par aventurier. Un nouvel ordre remplace celui du même personnage. Les PM sont consommés à l’exécution, après la reprise. Les compétences sont espacées de 0,65 seconde.</p><h3>Lire les intentions</h3><p>Une fiche ambrée annonce une attaque. Fracture et Éclat de givre l’interrompent. Le Gardien peut frapper le groupe entier.</p><h3>Survivre</h3><p>Chaque victoire rend 18 PV et 10 PM. La source restaure entièrement le groupe, une seule fois. Un repli ramène à l’entrée avec vos PV actuels. Une défaite vous permet de reprendre au dernier état sauvegardé.</p><p class="fine">Cette première version est volontairement sans musique ni bruitages.</p></div>`);}
function openMenu(){showDialog('Votre expédition',`<div class="menu-stack"><p class="dialog-intro">La progression est enregistrée sur cet appareil. Exportez une copie pour la conserver ou changer d’appareil.</p><button class="secondary" data-menu="export">Exporter la sauvegarde</button><button class="secondary" data-menu="import">Importer une sauvegarde</button><button class="secondary" data-menu="install" id="install-button" hidden>Installer le jeu</button><button class="secondary" data-menu="update" id="update-button" hidden>Appliquer la mise à jour</button><button class="danger-button" data-menu="new">Commencer une nouvelle expédition</button><span class="fine">Hollow Depths · Prototype 0.1 · Aucun son</span></div>`);if(installPrompt)$('install-button').hidden=false;if(waitingWorker)$('update-button').hidden=false;}

app.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
  if(button.dataset.move){act(button.dataset.move);return;}
  if(button.dataset.skill){useSkill(game,button.dataset.skill as Skill);ui();return;}
  if(button.dataset.target){selectTarget(game,Number(button.dataset.target));ui();return;}
  const outcome=button.dataset.outcome;
  if(outcome==='continue'){continueAfterBattle(game);enemyMarkup='';$('enemy-cards').innerHTML='';dirtyMap=true;persist();updateOutcome();ui();return;}
  if(outcome==='retry'){game=load()??createGame();game.phase='explore';game.battle=null;camera={x:game.position.x,y:game.position.y,yaw:game.direction*Math.PI/2};previousPhase='explore';enemyMarkup='';lastFeedback=0;dirtyMap=true;updateOutcome();ui();return;}
  if(outcome==='restart'){showDialog('Nouvelle expédition',`<p class="dialog-intro">Votre progression actuelle sera remplacée.</p><button class="primary" data-menu="confirm-new">Recommencer les cryptes</button>`);return;}
  if(button.id==='enter-button'){started=true;$('intro').hidden=true;lastTime=performance.now();return;}
  if(button.id==='pause-button'){togglePause(game);ui();}
  if(button.id==='speed-button'&&game.battle){game.battle.speed=game.battle.speed===1?2:1;ui();}
  if(button.id==='retreat-button'){showDialog('Replier le groupe',`<p class="dialog-intro">Vous regagnerez l’entrée avec vos PV et PM actuels. Les ennemis non vaincus retrouveront leurs forces.</p><button class="primary" data-menu="retreat">Rejoindre l’entrée</button>`);}
  if(button.id==='interact-button')act('interact');
  if(button.id==='map-button'||button.id==='mini-button')openMap();
  if(button.id==='help-button')openHelp();if(button.id==='menu-button')openMenu();
});
$('close-dialog').addEventListener('click',()=>dialog.close());
$('dialog-body').addEventListener('click',async event=>{
  const action=(event.target as Element).closest<HTMLElement>('[data-menu]')?.dataset.menu;if(!action)return;
  if(action==='export'){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([serialize(game)],{type:'application/json'}));a.href=url;a.download='hollow-depths-sauvegarde.json';a.click();URL.revokeObjectURL(url);}
  if(action==='import')$<HTMLInputElement>('import-file').click();
  if(action==='new')showDialog('Nouvelle expédition',`<p class="dialog-intro">Votre progression actuelle sera remplacée. Vous pouvez d’abord l’exporter depuis le menu.</p><button class="primary" data-menu="confirm-new">Commencer une nouvelle expédition</button>`);
  if(action==='confirm-new'){restart();dialog.close();}
  if(action==='retreat'){retreat(game);camera={x:game.position.x,y:game.position.y,yaw:0};dirtyMap=true;persist();dialog.close();ui();}
  if(action==='update'&&waitingWorker){persist();applyingUpdate=true;waitingWorker.postMessage({type:'APPLY_UPDATE'});}
  if(action==='install'&&installPrompt){await installPrompt.prompt();installPrompt=null;$('install-button').hidden=true;}
});
$('import-file').addEventListener('change',async event=>{
  const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;if(file.size>50000){showDialog('Import refusé','<p class="dialog-intro">Le fichier est trop volumineux.</p>');input.value='';return;}
  const imported=deserialize(await file.text());input.value='';
  if(!imported){showDialog('Sauvegarde invalide','<p class="dialog-intro">Ce fichier ne contient pas une sauvegarde compatible. Votre partie est conservée.</p>');return;}
  showDialog('Importer cette expédition',`<p class="dialog-intro">Cette sauvegarde remplacera la progression actuelle : ${imported.cleared.size} passage(s) libéré(s), ${imported.gold} éclats.</p><button class="primary" id="confirm-import">Remplacer la progression</button>`);
  $('confirm-import').addEventListener('click',()=>{game=imported;camera={x:game.position.x,y:game.position.y,yaw:game.direction*Math.PI/2};previousPhase=game.phase;lastFeedback=0;enemyMarkup='';$('enemy-cards').innerHTML='';dirtyMap=true;persist();dialog.close();updateOutcome();ui();});
});
document.addEventListener('keydown',event=>{
  if(!started||!ready||dialog.open||event.ctrlKey||event.metaKey||event.altKey)return;
  const key=event.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(key))event.preventDefault();
  if(event.repeat&&[' ','1','2','3','m'].includes(key))return;
  if(key===' '){togglePause(game);ui();return;}
  if(key==='m'){openMap();return;}
  if(['1','2','3'].includes(key)){useSkill(game,(['fracture','frost','heal']as Skill[])[Number(key)-1]);ui();return;}
  if(key==='tab'&&game.phase==='combat'){const living=game.battle!.enemies.filter(e=>e.hp>0);const index=living.findIndex(e=>e.id===livingTarget(game)?.id);selectTarget(game,living[(index+1)%living.length].id);ui();return;}
  const actions:Record<string,string>={arrowup:'forward',z:'forward',w:'forward',arrowdown:'back',s:'back',arrowleft:'turnLeft',arrowright:'turnRight',q:'left',a:'left',d:'right',e:'interact'};
  if(actions[key]){event.preventDefault();act(actions[key]);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(game.phase==='combat'&&game.battle&&!game.battle.paused)togglePause(game);if(game.phase==='explore')persist();ui();}lastTime=performance.now();});
window.addEventListener('resize',()=>{dirtyMap=true;if(dialog.open&&document.getElementById('full-map'))drawMap($<HTMLCanvasElement>('full-map'),game,true);});
let installPrompt:(Event&{prompt:()=>Promise<void>})|null=null,waitingWorker:ServiceWorker|null=null,applyingUpdate=false;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event as typeof installPrompt;});
if('serviceWorker'in navigator&&import.meta.env.PROD){
  navigator.serviceWorker.register('./sw.js').then(registration=>{waitingWorker=registration.waiting;registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){waitingWorker=worker;game.message='Une mise à jour est disponible dans le menu.';}});});}).catch(()=>{$('save-state').textContent='Installation hors ligne indisponible';});
  let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing||!applyingUpdate)return;refreshing=true;location.reload();});
}
function feedback(){
  for(const f of game.feedback){if(f.id<=lastFeedback)continue;lastFeedback=f.id;
    if(f.kind==='hurt'){$('impact').classList.remove('flash');void $('impact').offsetWidth;$('impact').classList.add('flash');const hero=$(`hero-${f.hero}`);hero.classList.remove('hit');void hero.offsetWidth;hero.classList.add('hit');}
    const floater=document.createElement('span');floater.className=`floater ${f.kind}`;floater.textContent=f.text;floater.style.left=f.hero!==undefined?`${25+f.hero*45}%`:`${game.battle?.enemies.length===2?40+(f.enemy??0)*20:50}%`;floater.style.top=f.hero!==undefined?'76%':'48%';$('floaters').append(floater);setTimeout(()=>floater.remove(),1100);
  }
}
function frame(now:number){
  const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;
  if(started&&!dialog.open&&!document.hidden){tick(game,dt);if(!game.battle?.paused)renderTime+=dt;transition=Math.max(0,transition-dt);}
  const blend=1-Math.exp(-dt*17);camera.x+=(game.position.x-camera.x)*blend;camera.y+=(game.position.y-camera.y)*blend;
  const targetYaw=game.direction*Math.PI/2;let delta=targetYaw-camera.yaw;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;camera.yaw+=delta*blend;
  renderer.render(game,camera,renderTime);feedback();
  if(now-lastUi>80){ui();lastUi=now;}
  if(renderer.error){showDialog('Rendu 3D interrompu',`<p class="dialog-intro">${renderer.error}</p>`);return;}
  requestAnimationFrame(frame);
}
try{
  renderer=new DungeonRenderer($<HTMLCanvasElement>('dungeon'));
  renderer.ready.then(()=>{ready=true;$('loading').hidden=true;started=!newPlayer;$('intro').hidden=!newPlayer;updateOutcome();ui();requestAnimationFrame(frame);}).catch(()=>{$('loading').innerHTML='<p>Le bestiaire n’a pas pu être chargé. Vérifiez la connexion, puis rechargez la page.</p>';});
}catch(error){$('loading').innerHTML=`<p>${String(error)}</p>`;}
ui();
