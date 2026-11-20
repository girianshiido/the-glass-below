import type {Game} from './engine.ts';
export type MusicScene='level'|'combat'|'boss';
export type Sound='slash-1'|'slash-2'|'slash-3'|'slash-4'|'hit'|'frost'|'heal'|'fracture'|'step'|'gate'|'reward';
export interface SoundSettings {muted:boolean;music:number;effects:number}
export const DEFAULT_SOUND:SoundSettings={muted:false,music:.3,effects:.65};
export function parseSoundSettings(raw:string|null):SoundSettings{
  try{const s=JSON.parse(raw??'null');return s&&typeof s.muted==='boolean'&&Number.isFinite(s.music)&&Number.isFinite(s.effects)?{muted:s.muted,music:Math.max(0,Math.min(1,s.music)),effects:Math.max(0,Math.min(1,s.effects))}:{...DEFAULT_SOUND};}catch{return{...DEFAULT_SOUND};}
}
export function musicScene(g:Game,started:boolean):MusicScene|null{
  if(!started)return null;
  if(g.phase==='explore')return'level';
  if(g.phase==='combat')return g.battle?.enemies.some(e=>e.kind==='sentinel')?'boss':'combat';
  return null;
}
export const MUSIC_FILES:Record<MusicScene,[string,string]>={level:['./audio/level.ogg','./audio/level.m4a'],combat:['./audio/combat.ogg','./audio/combat.m4a'],boss:['./audio/boss.ogg','./audio/boss.m4a']};
export const MUSIC_LOOP_SECONDS:Record<MusicScene,number>={level:53.333333333333336,combat:24.827573696145123,boss:21.176462585034013};
export const SOUND_FILES:Record<Sound,[string,string]>={
  'slash-1':['./audio/slash-1.ogg','./audio/slash-1.m4a'],
  'slash-2':['./audio/slash-2.ogg','./audio/slash-2.m4a'],
  'slash-3':['./audio/slash-3.ogg','./audio/slash-3.m4a'],
  'slash-4':['./audio/slash-4.ogg','./audio/slash-4.m4a'],
  hit:['./audio/hit.ogg','./audio/hit.m4a'],frost:['./audio/frost.ogg','./audio/frost.m4a'],heal:['./audio/heal.ogg','./audio/heal.m4a'],fracture:['./audio/fracture.ogg','./audio/fracture.m4a'],step:['./audio/step.ogg','./audio/step.m4a'],gate:['./audio/gate.ogg','./audio/gate.m4a'],reward:['./audio/reward.ogg','./audio/reward.m4a'],
};
