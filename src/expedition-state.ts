import type {Game} from './engine.ts';
import type {Point} from './world.ts';
import {FLOATING_WALKWAY} from './expedition-world.ts';

export const EXPEDITION_FLAGS=[
  'ledger','westBurner','eastBurner','courierReported','freight','signal','relayAligned','culvert','lantern','lanternReturned',
  'priorCryptAccess','priorKeeperAccess',
] as const;

export type ExpeditionProgress=Partial<Record<typeof EXPEDITION_FLAGS[number],boolean>> & {
  waterLow?:boolean;
  tideChangedAt?:number;
};

export function burnersLit(g:Game){
  const p=g.campaign?.expedition;
  return !!(p?.westBurner&&p.eastBurner);
}

export function cryptAccess(g:Game){
  const c=g.campaign;
  return !!(c?.recruited&&(c.stage>=6||c.expedition?.priorCryptAccess||c.expedition?.ledger||burnersLit(g)));
}

export function keeperAccess(g:Game){
  const c=g.campaign;
  return !!(c&&(c.stage>=11||c.expedition?.priorKeeperAccess||c.expedition?.relayAligned));
}

export function lowWater(g:Game){
  const c=g.campaign;
  return c?.expedition?.waterLow??((c?.stage??0)>=10);
}

export function isFloatingWalkway({x,y}:Point){
  return y===FLOATING_WALKWAY.y&&x>=FLOATING_WALKWAY.start&&x<=FLOATING_WALKWAY.end;
}
