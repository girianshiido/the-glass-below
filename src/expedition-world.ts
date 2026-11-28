import type {Building, RegionWorld} from './region-world.ts';

export function roomMap(width:number,height:number,rooms:number[][],buildings:Building[]=[]){
  const grid=Array.from({length:height},()=>Array<string>(width).fill('#'));
  for(const [x,y,w,h] of rooms)for(let row=y;row<y+h;row++)grid[row].fill('.',x,x+w);
  for(const {x,y,w,d} of buildings)for(let row=y;row<y+d;row++)grid[row].fill('#',x,x+w);
  return grid.map(row=>row.join(''));
}

export const ANNEALING_DOOR={x:0,y:11};
export const SERVICE_DOOR={x:22,y:3};
export const FLOATING_WALKWAY={y:9,start:24,end:29};
export const BELL_BARRIER={x:12,y:4};

export const ANNEALING:RegionWorld={
  zone:'annealing',ceiling:4.75,outdoor:false,spawn:{x:11,y:16},direction:3,
  map:roomMap(23,18,[
    [11,14,1,4],[9,11,5,4],[7,13,3,1],[3,10,5,5],
    [5,6,1,5],[3,3,5,4],[7,5,10,1],[10,1,3,4],
    [16,3,4,5],[18,7,1,5],[15,11,5,4],[13,13,2,1],
  ]),
  buildings:[],residents:[],entrances:[],
  passages:[
    {id:'annealing-return',x:11,y:17,to:'glassworks',spawn:{x:1,y:11},direction:0,label:'Return to the furnace hall'},
    {id:'annealing-service',x:11,y:1,to:'glassworks',spawn:{x:21,y:3},direction:2,label:'Take the service passage'},
  ],
  encounters:[
    {id:'annealing-archives',x:5,y:13,kind:'scavenger',name:'Ledger Guardian',strength:1.25,tactic:'shell'},
    {id:'annealing-draft',x:5,y:8,kind:'wraith',name:'Chimney Watcher',strength:1.2},
    {id:'annealing-bridge',x:15,y:5,kind:'wraith',name:'Flue Wraith',strength:1.4,tactic:'riposte'},
    {id:'annealing-kiln',x:17,y:13,kind:'scavenger',name:'Coalglass Crawler',strength:1.35},
  ],
};

export const WAREHOUSE:RegionWorld={
  zone:'warehouse',ceiling:5.5,outdoor:false,spawn:{x:3,y:14},direction:3,
  map:roomMap(21,16,[
    [3,14,1,2],[2,10,7,5],[6,5,1,5],[2,2,7,4],[8,3,6,1],[13,2,6,4],
    [16,5,1,7],[14,7,4,2],[11,11,6,3],[8,12,3,1],[11,7,1,5],
  ]),
  buildings:[],residents:[],entrances:[],
  passages:[
    {id:'warehouse-return',x:3,y:15,to:'estuary',spawn:{x:28,y:9},direction:2,label:'Cross the floating walkway'},
    {id:'warehouse-culvert',x:17,y:8,to:'lockworks',spawn:{x:24,y:6},direction:2,label:'Take the culvert beneath the quay'},
  ],
  encounters:[
    {id:'warehouse-hold',x:6,y:11,kind:'scavenger',name:'Brinebound Porter',strength:1.6,tactic:'shell'},
    {id:'warehouse-gantry',x:11,y:3,kind:'wraith',name:'Chain Wraith',strength:1.64,tactic:'riposte'},
    {id:'warehouse-vault',x:16,y:4,kind:'scavenger',name:'Saltglass Broodling',strength:1.6},
    {id:'warehouse-sorting',x:12,y:12,kind:'wraith',name:'Cargo Watcher',strength:1.55},
  ],
};

export const EXPEDITION_FIXTURES={
  ledger:{zone:'annealing',x:3,y:11,label:'Read the courier’s ledger'},
  westBurner:{zone:'annealing',x:3,y:4,label:'Light the west burner'},
  eastBurner:{zone:'annealing',x:19,y:11,label:'Light the east burner'},
  freight:{zone:'warehouse',x:17,y:2,label:'Read the freight register'},
  signal:{zone:'lockworks',x:16,y:12,label:'Inspect the bell relay'},
  lantern:{zone:'lockworks',x:23,y:15,label:'Recover the signal lantern'},
} as const;

export type ExpeditionFixture=keyof typeof EXPEDITION_FIXTURES;
