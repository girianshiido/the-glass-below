export const MAP = [
  '###################',
  '#.....#...........#',
  '#.###.#.###.#####.#',
  '#.#...#...#.....#.#',
  '#.#.#####.###.#.#.#',
  '#.#.......#...#...#',
  '#.#####.#.#.#####.#',
  '#.......#.#.....#.#',
  '###.#####.#####.#.#',
  '#...#.....#.....#.#',
  '#.###.#####.###.#.#',
  '#.....#.....#...#.#',
  '#.#####.#####.###.#',
  '#...............#.#',
  '###################',
] as const;
export const WIDTH = MAP[0].length;
export const HEIGHT = MAP.length;
export const DIRECTIONS = [[1,0],[0,1],[-1,0],[0,-1]] as const;
export const CARDINALS = ['E','S','W','N'];
export interface Point { x:number; y:number }
export type CreatureKind = 'scavenger'|'wraith'|'sentinel';
export interface EncounterDef extends Point { id:string; kind:CreatureKind; name?:string; strength?:number; tactic?:'shell'|'riposte' }
export const ENCOUNTERS:EncounterDef[] = [
  {id:'first',x:5,y:1,kind:'scavenger'},
  {id:'watch',x:3,y:5,kind:'wraith'},
  {id:'pair',x:7,y:7,kind:'scavenger'},
  {id:'passage',x:9,y:3,kind:'wraith'},
  {id:'vault',x:15,y:5,kind:'wraith'},
  {id:'guardian',x:17,y:11,kind:'sentinel'},
];
export const CHEST:Point={x:5,y:3};
export const GATE:Point={x:17,y:9};
export const SHRINE:Point={x:1,y:7};
export const EXIT:Point={x:17,y:13};
export const START:Point={x:1,y:1};
export const same=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
export function wall(x:number,y:number){return MAP[y]?.[x]!=='.';}
export function lineOfSight(a:Point,b:Point,gateOpen=true){
  const distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance*12));
  for(let n=1;n<=steps;n++){
    const x=Math.round(a.x+(b.x-a.x)*n/steps),y=Math.round(a.y+(b.y-a.y)*n/steps);
    if(wall(x,y)||(!gateOpen&&same({x,y},GATE)))return false;
  }
  return true;
}
export function reveal(seen:Set<string>,position:Point,gateOpen:boolean){
  for(let y=position.y-4;y<=position.y+4;y++)for(let x=position.x-4;x<=position.x+4;x++){
    if(x<0||x>=WIDTH||y<0||y>=HEIGHT)continue;
    if(Math.hypot(x-position.x,y-position.y)<=4.2){
      if(lineOfSight(position,{x,y},gateOpen))seen.add(`${x},${y}`);
      else if(wall(x,y)){
        for(const [dx,dy]of DIRECTIONS)if(lineOfSight(position,{x:x+dx*.6,y:y+dy*.6},gateOpen))seen.add(`${x},${y}`);
      }
    }
  }
}
