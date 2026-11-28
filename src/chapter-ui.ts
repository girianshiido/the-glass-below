import {burnersLit,cryptAccess,lowWater} from './expedition-state.ts';
import {campaignAction,campaignObjective,xpNeeded,ESTUARY_STAGE,activeHero,companion,partyNeedsRest,REST_COST} from './campaign.ts';
import type {Zone} from './campaign.ts';
import {skillPower,SKILLS,partySkills} from './engine.ts';
import type {Game} from './engine.ts';
export const ZONE_NAMES:Record<Zone,string>={village:'Greyhaven',road:'Old Pine Road',glassworks:'The Silent Glassworks',crypts:'The Glass Crypts',estuary:'Saltreach',lockworks:'The Drowned Lock',annealing:'The Annealing Wing',warehouse:'The Bonded Warehouse'};
const mark=(letter:string)=>{const frame:Record<string,number>={E:0,M:1,T:2,L:3};return `<span class="speaker-seal character-art ${letter==='K'?'kael':letter==='L'?'lys':letter==='N'?'neris':'resident'}" style="--portrait:${frame[letter]??0}" aria-hidden="true"></span>`;};
export class ChapterUI{
 constructor(private root:HTMLElement,private get:()=>Game,private changed:()=>void,private show:(title:string,html:string)=>void){
 root.addEventListener('click',e=>{const action=(e.target as Element).closest<HTMLElement>('[data-chapter]')?.dataset.chapter;if(action)this.action(action);});
 document.getElementById('dialog-body')!.addEventListener('click',e=>{const el=(e.target as Element).closest<HTMLElement>('[data-chapter]');if(el&&!el.hasAttribute('disabled'))this.action(el.dataset.chapter!);});
 }
 render(){this.root.hidden=true;}
 action(action:string){const g=this.get(),c=g.campaign;if(!c)return;
 if(action==='walk'){this.close();g.message='';this.changed();return;}
 if(action==='furnace'){this.close();g.message='Approach the Watcher in the centre of the furnace hall.';this.changed();return;}
 if(action==='region'){this.region();return;}
 if(action==='journal'){this.journal();return;}
 if(action==='party'){this.party();return;}
 if(action==='report-courier'&&campaignAction(g,action)){
   this.changed();
   this.show('The courier’s last run',this.dialogue('E','“I thought he had taken their money. The ledger says he tried to return the names. He put his stamp on the order so the blame would be his alone.”')
     +'<p class="reward-line">Courier’s seal · +4 maximum MP for the party</p><button class="secondary" data-chapter="elara">Continue speaking with Elara</button>');
   return;
 }
 if(action==='return-lantern'&&campaignAction(g,action)){this.changed();this.neris(true);return;}
 if(action==='elara'){
 const report=c.expedition?.ledger&&!c.expedition.courierReported
   ?'<button class="secondary" data-chapter="report-courier">Show her the courier’s ledger</button>':'';

 if(c.stage>=ESTUARY_STAGE.rumor){
   const rumor=c.stage===ESTUARY_STAGE.rumor;
   const line=rumor
     ? '“Two short notes, then one long. That was how my brother called me home.”'
     : '“The coast road branches north from the pines. Neris keeps the boathouse at Saltreach.”';
   const invitation=rumor
     ? this.dialogue('L',line)+this.dialogue('E','“Then ask Neris. Take the side trail north from the first clearing. The old tollgate controls the bridge across the inlet. Follow the causeway on the far side to Saltreach.”')
     : this.dialogue('E',line);
   this.show('Elder Elara',invitation+(rumor?'<button class="primary" data-chapter="follow-bell">Follow the bell</button>':'')+report);
   return;
 }

 const lines=[`“My husband forgot our daughter's name yesterday. This morning, I forgot his face. The old road is full of things made of glass. Clear it, and find what happened to our courier.”`, `“Three creatures haunt the Old Pine Road. Bring light back to the path, Kael. Then we can reach the glassworks.”`, `“The courier's satchel was empty? Then the memories are being carried somewhere else. Take this payment. Lys went to the glassworks before dawn. Please find her.”`, `“Lys knew the old furnaces better than anyone. Look for her at the abandoned glassworks.”`, `“A woman is trapped beyond the furnace? Bring her home.”`, `“The kiln stairs lead below the village. If the glass remembers our lives, perhaps you can bring them back.”`, `“This prism… I remember her laugh. Not her name yet, but her laugh. You have given us a beginning. There are other prisms, Kael. And other villages.”`, `“Mara remembers the song she used to sing. Tovin remembers his brother. The road remains dangerous, but Greyhaven is awake again.”`];
 this.show('Elder Elara',this.dialogue('E',lines[c.stage])+`<div class="dialog-actions">${c.stage===0?'<button class="primary" data-chapter="accept">I will clear the road</button>':c.stage===2?'<button class="primary" data-chapter="report">Report the cleared road · Claim reward</button>':c.stage===6?'<button class="primary" data-chapter="ending">Return the memory prism</button>':'<button class="secondary" data-chapter="region">Open region map</button>'}${report}</div>`);return;
 }
 if(['accept','report','recruit','ending'].includes(action)){if(campaignAction(g,action)){this.changed();if(action==='recruit')this.show('Lys joins the party',this.dialogue('L','“The stairs under the kiln are sealed. The annealing wing west of this hall has the courier’s ledger and two burners. His stamp can release the stairs. If the ledger is gone, heat from both burners will lift the lock.”')+'<p class="reward-line">Lys joins at your level. Frost Shard and Mending Seal are now available.</p><button class="primary" data-chapter="walk">Explore the annealing wing</button>');else if(action==='ending')this.show('Chapter I · The Borrowed Light',`<div class="chapter-ending">◇</div><h3>Greyhaven remembers</h3><p class="dialog-intro">The village lamps burn steadily for the first time in weeks. Beneath the glassworks, the Warden is silent. Somewhere beyond the pines, another bell begins to ring.</p><p class="reward-line">Chapter complete · +100 shards · +100 XP</p><button class="primary" data-chapter="elara">Ask Elara about the bell</button>`);else this.action('elara');}return;}
 if(action==='follow-bell'&&campaignAction(g,action)){
   this.changed();
   this.show('Chapter II · The Drowned Bell',this.dialogue('L','“If it really was him, he knew I would hear it. Come on. We can make the coast before the light goes.”')+'<button class="primary" data-chapter="walk">Leave for Saltreach</button>');
   return;
 }
 if(action==='neris'){this.neris();return;}
 if(action==='meet-neris'&&campaignAction(g,action)){this.changed();this.neris();return;}
 if(action==='ledger'&&campaignAction(g,action)){
   this.changed();
   const note='Release under courier seal. Refuse all transfers until the names are restored.';
   this.show('The courier’s ledger',`<blockquote class="story-quote">${note}</blockquote>`
     +this.dialogue(companion(g)==='lys'?'L':'K',companion(g)==='lys'
       ?'“He was bringing the memories back. His stamp will release the kiln stairs. Elara should see the whole page.”'
       :'The release stamp on the page still fits the kiln lock. Elara should see what the courier wrote.')
     +'<button class="primary" data-chapter="walk">Close ledger</button>');
   return;
 }
 if((action==='westBurner'||action==='eastBurner')&&campaignAction(g,action)){
   g.message=burnersLit(g)?'Both burners are lit. The kiln stairs are unlocked.':'The burner lights. The other flue still needs heat.';
   this.changed();
   return;
 }
 if(action==='freight'&&campaignAction(g,action)){
   this.changed();
   const reply=companion(g)==='lys'?this.dialogue('L','“That red knot is my brother’s mark. But these are departure times, not names. Someone used our signal as a schedule.”'):'';
   this.show('The freight register','<blockquote class="story-quote">Red Knot. North Channel. Two short strokes, one long. Relay to the bell bridge.</blockquote>'
     +reply+'<p class="dialog-intro">The cargo code can be checked against the relay beneath the quay.</p><button class="primary" data-chapter="walk">Close register</button>');
   return;
 }
 if(action==='signal'&&campaignAction(g,action)){
   this.changed();
   const clue=c.expedition?.freight?'The pins match the mark in the freight register. The bell bridge releases.':'The relay is stamped with a cargo mark. The freight register will tell you how to set the pins.';
   const reply=companion(g)==='lys'?this.dialogue('L','“I thought the bell was calling me. Listen to that pause. It answers a second bell, farther downriver.”'):'';
   this.show('The bell relay',reply+`<p class="dialog-intro">${clue}</p><button class="primary" data-chapter="walk">Step back</button>`);
   return;
 }
 if(action==='lantern'&&campaignAction(g,action)){
   this.changed();
   this.show('The lost signal lantern','<p class="dialog-intro">A green lantern lies between the stones. Neris’s initials are cut into the handle.</p><button class="primary" data-chapter="walk">Take the lantern</button>');
   return;
 }
 if(action==='drain-lock'||action==='raise-lock'){
   if(campaignAction(g,action)){
     g.message=lowWater(g)?'The water recedes. The lower stairs are clear.':'The water rises and floats the warehouse walkway.';
     this.changed();
   }else this.show('The sluice wheel','<p class="dialog-intro">The locking pin is still in place. The ferrymaster may know how to release it.</p>');
   return;
 }
 if(action==='part-ways'){
   if(g.heroes[0].hp<=0){
     this.show('The mooring','<p class="dialog-intro">Kael needs to get back on his feet before Lys can leave. Use a healing tonic or rest at Neris’s boathouse.</p><button class="secondary" data-chapter="walk">Return to the quay</button>');
     return;
   }
   this.show('The mooring',this.dialogue('L','“The keeper’s tally marks him as alive. I was wrong about who rang the bell, but I know which channel his barge took. If I launch now, I can catch it.”')+this.dialogue('K','“Then go. The tide gate is still open. I will keep the water out of the houses.”')+'<button class="primary" data-chapter="lys-departs">See Lys off</button>');
   return;
 }
 if(action==='lys-departs'&&campaignAction(g,'part-ways')){
   this.changed();
   this.show('Lys sets out',this.dialogue('L','“Tell Neris I owe her a boat. And Kael… listen for the bell.”')+'<p class="dialog-intro">Her boat slips into the mist. Water is already rising at the far end of the lower quay.</p><button class="primary" data-chapter="walk">Follow the quay to the tide gate</button>');
   return;
 }
 if(action==='secure-tide'){
   if(campaignAction(g,action)){
     g.message='The tide gate is shut. Return to Neris at the boathouse.';
     this.changed();
   }else{
     g.message='A creature is still in the spillway.';
     this.changed();
   }
   return;
 }
 if(action==='sail-with-neris'&&campaignAction(g,action)){
   this.changed();
   this.show('Chapter III · The River of Names',this.dialogue('N','“There is another landing downriver. I know every snag and sandbank between here and there. We will find the barge.”')+'<p class="reward-line">Neris joins the party. Breakwater blunts an enemy strike. Hook Feint sets up a stronger Fracture.</p><button class="primary" data-chapter="walk">Return to Saltreach</button>');
   return;
 }
 if(action==='lys'){this.show('Lys',this.dialogue('L',c.stage<4?'“Do not come closer. The Watcher wakes when it hears a name. Break its lantern, and I can reach you.”':c.stage===4?'“You broke its hold. I came here for my brother. The furnace speaks with his voice. Let me come with you.”':'“The prism below is only one fragment. Someone built a whole network beneath these villages.”')+(c.stage===4?'<button class="primary" data-chapter="recruit">Ask Lys to join you</button>':c.recruited?'<button class="primary" data-chapter="walk">Find the kiln stairs</button>':'<button class="primary" data-chapter="furnace">Confront the Watcher</button>'));return;}
 if(action==='inn'){this.interior('inn','The Lantern & Thorn','<p class="service-quote">“A warm room. A meal. A few things the glass has not taken from us. Rest while you can.”</p>'+this.restOption());return;}
 if(action==='shop'){this.shop();return;}
 if(action.startsWith('buy-')){const ok=campaignAction(g,action);this.changed();this.shop(ok?'Purchase complete.':'Not enough shards or already owned.');return;}
 if(action==='rest'){
   if(campaignAction(g,action)){
     this.changed();
     if(c.zone==='estuary')this.neris(false,true);
     else this.interior('inn','A quiet night','<p class="service-quote">“You look more like yourself. That matters, these days.”</p><p class="reward-line">HP and MP fully restored.</p>');
   }
   return;
 }
 if(action==='potion'){if(campaignAction(g,action)){this.changed();this.party();}return;}
 }
 private interior(kind:'inn'|'shop'|'neris',title:string,html:string){this.show(title,`<section class="service-scene service-${kind}" aria-label="${kind==='inn'?'Inside Mara’s inn':kind==='shop'?'Inside Tovin’s shop':'Inside Neris’s boathouse'}"><div class="service-ui">${html}<button class="secondary service-leave" data-chapter="walk">Return outside</button></div></section>`);document.getElementById('dialog')!.classList.add('service-dialog');}
 private restOption(){
   const g=this.get();
   if(!partyNeedsRest(g))return '';
   return `<button class="secondary" data-chapter="rest" ${g.gold<REST_COST?'disabled':''}>Rest · ${REST_COST} shards</button>`;
 }
 private neris(returned=false,rested=false){
   const c=this.get().campaign!,stage=c.stage;
   const lines:Record<number,string>={
     [ESTUARY_STAGE.trail]:'“There’s a register in the bonded warehouse across the floating walkway. The bell sounds from under the quay. I can show you how to free the wheel to reach the old relay.”',
     [ESTUARY_STAGE.sluice]:'“At high water, cross to the warehouse from the east quay. At low water, you can take the steps by the north pier. I lost my green signal lantern down there, if you see it.”',
     [ESTUARY_STAGE.drained]:'“The wheel works both ways. Read the warehouse register and check the relay below the quay. The old culvert can save you a trip if you unbolt it from below.”',
     [ESTUARY_STAGE.mooring]:'“Someone drew a cargo tally this morning. If Lys found a name on it, take her down to the mooring.”',
     [ESTUARY_STAGE.alone]:'“The lower quay runs east behind the cottages. Close the tide gate at the end or we will have water in the houses.”',
     [ESTUARY_STAGE.ferrymaster]:'“You kept the water out. I saw which channel that barge took. If you are still going after it, I am coming with you.”',
     [ESTUARY_STAGE.joined]:'“Now we know which channel the barge took. Keep that tally safe.”',
   };
   const button=stage===ESTUARY_STAGE.trail?'<button class="primary" data-chapter="meet-neris">Ask about the sluice</button>'
     :stage===ESTUARY_STAGE.ferrymaster?'<button class="primary" data-chapter="sail-with-neris">Ask Neris to join you</button>':'';
   const lantern=c.expedition?.lantern&&!c.expedition.lanternReturned
     ?'<button class="secondary" data-chapter="return-lantern">Return the signal lantern</button>':'';
   const reply=returned?'<p class="service-quote">“My father taught me to signal the ferries with this. You’ve brought something home that I thought the tide had taken.”</p><p class="reward-line">+30 shards · 2 healing tonics</p>'
     :`<p class="service-quote">${lines[stage]??'“The tide turns before dusk.”'}</p>`;
   const rest=rested?'<p class="reward-line">HP and MP fully restored.</p>':this.restOption();
   this.interior('neris','Neris’s boathouse',reply+button+lantern+rest);

 }
 private close(){(document.getElementById('dialog')as HTMLDialogElement).close();}
 private dialogue(letter:string,line:string){return `<div class="dialogue-speaker">${mark(letter)}<p>${line}</p></div>`;}
 region(){
   const g=this.get(),c=g.campaign!,showCoast=c.stage>=ESTUARY_STAGE.trail;
   const nodes:[Zone,string][]=[['village','Rest & supplies'],['road','Eastern village gate'],['glassworks','Beyond the pine road'],['crypts','Below the glassworks']];
   if(showCoast)nodes.push(['estuary','Old tollgate off the pine road'],['lockworks','Beneath the quay']);
   this.show('The Greyhaven Coast',`<div class="region-map ${showCoast?'expanded':''}">
     <svg viewBox="0 0 500 300" aria-hidden="true">
       <path class="coast" d="M0 210Q110 110 180 178T310 230T500 220V300H0Z"/>
       <path class="region-road" d="M100 190Q200 70 280 95T410 175"/>
       <path class="region-road underground" d="M410 175L380 265"/>
       ${showCoast?'<path class="region-road" d="M220 63Q290 72 325 36"/><path class="region-road underground" d="M357 50Q348 24 400 38"/>':''}
     </svg>
     ${nodes.map(([z,detail])=>`<div class="region-node ${z==='glassworks'?'works':z} ${c.zone===z?'current':''}"><b>${ZONE_NAMES[z]}</b><small>${c.zone===z?'You are here':detail}</small></div>`).join('')}
     </div>
     ${c.stage>=2?'<p class="fine">The Annealing Wing lies west of the glassworks hall.</p>':''}
     ${showCoast?'<p class="fine">From Saltreach, take the floating walkway to the Bonded Warehouse or the north steps to the Drowned Lock.</p>':''}
     ${['annealing','warehouse'].includes(c.zone)?`<p class="fine">You are in ${ZONE_NAMES[c.zone]}.</p>`:''}
     <p class="quest-current">${campaignObjective(g)}</p>`);
 }
 journal(){
   const g=this.get(),c=g.campaign!,p=c.expedition;
   const quests=[
     ['The Borrowed Light','Speak to Elder Elara',c.stage>0],
     ['A Road of Shards',`Clear the road · ${c.roadCleared.length} / 3 threats defeated`,c.stage>2],
     ['The Voice in the Furnace','Find and recruit Lys at the glassworks',c.recruited],
     ['What the Glass Remembers','Defeat the Warden and bring the prism to Elara',c.stage>=ESTUARY_STAGE.rumor],
   ];
   if(c.stage>=4)quests.splice(3,0,
     ['The Cold Furnace','Find the ledger or relight both burners to open the kiln stairs',cryptAccess(g)],
     ['The Courier’s Last Run',p?.ledger?'Optional · Show Elara what the ledger says':'Optional · Look for the courier’s papers in the west archive',!!p?.courierReported],
   );
   if(c.stage>=ESTUARY_STAGE.trail)quests.push(
     ['A Mark on the Manifest','Search the bonded warehouse at high water or through the culvert',!!p?.freight],
     ['An Answer from Below','Find the bell relay and set its pins using the register',!!p?.relayAligned],
     ['The Drowned Bell','Talk to Neris, drain the lock and trace the bell',c.stage>=ESTUARY_STAGE.mooring],
     ['A Boat in the Mist','Speak to Lys at the mooring after opening the tower door',c.stage>=ESTUARY_STAGE.alone],
   );
   if(c.stage>=ESTUARY_STAGE.sluice)quests.push(['The Green Lantern',p?.lantern?'Optional · Return the lantern to Neris':'Optional · Search the southern sump beneath the quay',!!p?.lanternReturned]);
   if(c.stage>=ESTUARY_STAGE.alone)quests.push(['The Tide Gate','Close the tide gate and return to Neris',c.stage>=ESTUARY_STAGE.joined]);
   this.show('Journal',`<p class="quest-current">${campaignObjective(g)}</p><div class="quest-list">${quests.map(([title,desc,done])=>`<article class="${done?'done':''}"><span>${done?'✓':'◇'}</span><div><h3>${title}</h3><p>${desc}</p></div></article>`).join('')}</div>`);
 }
 party(){
   const g=this.get(),c=g.campaign!,neris=companion(g)==='neris';
   const heroes=g.heroes.map((h,i)=>activeHero(g,i)?`<article>${mark(i===0?'K':neris?'N':'L')}<h3>${h.name} <small>Level ${c.level}</small></h3><p>${i===0?'Vanguard':neris?'Ferrymaster':'Frostweaver'} · ${h.attack} attack</p><p>${Math.ceil(h.hp)} / ${h.maxHp} HP · ${Math.floor(h.mp)} / ${h.maxMp} MP</p></article>`:'').join('');
   const skills=partySkills(g).map(id=>{
     const power=id==='breakwater'?'50% less damage':id==='heal'?`${skillPower(g,id)} HP`:`${skillPower(g,id)} damage`;
     return `<p><span>${SKILLS[id].name}</span><b>${power} · ${SKILLS[id].cost} MP</b></p>`;
   }).join('');
   this.show('Party & equipment',`<div class="character-sheet">${heroes}</div><div class="xp-track"><i style="width:${Math.min(100,c.xp/xpNeeded(c.level)*100)}%"></i></div><p class="fine">${c.xp} / ${xpNeeded(c.level)} XP to level ${c.level+1}</p><div class="equipment-list">${skills}</div><div class="equipment-list"><p><span>Weapon</span><b>${c.weapon==='iron'?'Iron sword':'Tempered blade · +5 attack'}</b></p><p><span>Protection</span><b>${c.armor==='travel'?'Travel coat':'Warden leather · +20 HP · −3 incoming damage'}</b></p><p><span>Accessory</span><b>${c.charm?'Frostglass charm · +8 Frost Shard damage':'None'}</b></p></div><button class="primary" data-chapter="potion" ${c.potions===0?'disabled':''}>Use healing tonic · ${c.potions} remaining</button><p class="fine">Tonics restore 80 HP to the most wounded party member.</p><p class="reward-line">Key items: Sealed letter${c.stage>=2?' · Empty courier’s satchel':''}${c.stage===6?' · Memory prism':''}${c.stage>=ESTUARY_STAGE.mooring?' · Cargo tally':''}${c.expedition?.courierReported?' · Courier’s seal (+4 MP)':''}</p>`);
 }
 private shop(message=''){const g=this.get(),c=g.campaign!;const goods=[['buy-potion','Healing tonic','Restores 80 HP',12,c.potions>=9],['buy-weapon','Tempered blade','+5 attack',45,c.weapon==='tempered'],['buy-armor','Warden leather','+20 HP · −3 damage received',40,c.armor==='warden'],['buy-charm','Frostglass charm','+8 Frost Shard damage',30,c.charm]]as const;this.interior('shop',"Tovin's provisions",'<p class="service-quote">“Iron for what has teeth. Glass for what has none. Both are useful on that road.”</p>'+`<p class="reward-line">${g.gold} shards · ${message}</p><div class="shop-list">${goods.map(([action,name,desc,price,owned])=>`<button data-chapter="${action}" ${owned||g.gold<price?'disabled':''}><span><b>${name}</b><small>${desc}</small></span><strong>${owned?'Owned':price+' ◇'}</strong></button>`).join('')}</div>`);}
}
