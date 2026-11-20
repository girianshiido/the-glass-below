import type {Game} from './engine.ts';

export const GAME_TITLE='The Glass Below';
export const LEVEL_TITLE='The Glass Crypts';
export interface TimedCaption {text:string;startedAt:number;hold:number;fade:number}
export function caption(text:string,now:number,hold=4,fade=.8):TimedCaption{return{text,startedAt:now,hold,fade};}
/** Times are in seconds. A caption expires once, independently of combat time. */
export function captionOpacity(c:TimedCaption|null,now:number){
  if(!c||!c.text)return 0;
  const age=Math.max(0,now-c.startedAt);
  if(age<c.hold)return 1;
  if(c.fade<=0)return 0;
  return Math.max(0,1-(age-c.hold)/c.fade);
}
export function objective(g:Game){
  return g.cleared.has('guardian')?'Reach the exit':g.gateOpen?'Defeat the Faceless Warden':g.key?'Open the eastern gate':'Find the copper key';
}
