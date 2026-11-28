import {roomMap,FLOATING_WALKWAY} from './expedition-world.ts';
import type {Building, RegionWorld} from './region-world.ts';

const estuaryBuildings: Building[] = [
  {x:10,y:7,w:3,d:2,h:3.65,roof:1.65,kind:'house'},
  {x:15,y:7,w:3,d:2,h:4.05,roof:1.7,kind:'house'},
  {x:17,y:12,w:3,d:2,h:3.45,roof:1.45,kind:'house'},
];

export const ESTUARY_STAGE={
  rumor:7, trail:8, sluice:9, drained:10, mooring:11, alone:12, ferrymaster:13, joined:14,
} as const;

export const ROAD_TO_ESTUARY = {x:11,y:7};
export const SLUICE_WHEEL = {x:19,y:2};
export const MOORING = {x:21,y:11};
export const TIDE_GATE = {x:24,y:14};
export const BELL_STEPS = {x:22,y:3};
export const LOCK_STAIRS = {x:21,y:5};

export const ESTUARY: RegionWorld = {
  zone:'estuary',
  map:roomMap(31,17,[[0,12,9,1],[4,11,2,1],[7,11,4,1],[9,6,13,9],[19,2,1,5],[19,3,4,2],[21,5,1,1],[22,9,2,2],[20,14,5,1],[24,9,6,1]],estuaryBuildings),
  spawn:{x:1,y:12}, direction:0, outdoor:true, ceiling:0,
  buildings:estuaryBuildings, residents:[], entrances:[{id:'neris',x:11,y:9,direction:3}],
  passages:[
    {id:'estuary-return',x:0,y:12,to:'road',spawn:{x:11,y:8},direction:1,label:'Old Pine Road'},
    {id:'lock-stairs',...LOCK_STAIRS,to:'lockworks',spawn:{x:2,y:11},direction:3,label:'Descend beneath the quay'},
    {id:'warehouse-walkway',x:FLOATING_WALKWAY.end,y:FLOATING_WALKWAY.y,to:'warehouse',spawn:{x:3,y:14},direction:3,label:'Enter the bonded warehouse'},
    {id:'bell-shortcut',...BELL_STEPS,to:'lockworks',spawn:{x:13,y:1},direction:2,label:'Descend the bell tower stairs'},
  ],
  encounters:[
    {id:'estuary-causeway',x:4,y:12,kind:'scavenger',name:'Saltglass Crawler',strength:1.5},
    {id:'estuary-weir',x:19,y:5,kind:'wraith',name:'Weir Lantern',strength:1.6},
    {id:'estuary-quay',x:23,y:9,kind:'scavenger',name:'Quay Skulker',strength:1.45},
    {id:'tide-stray',x:22,y:14,kind:'scavenger',name:'Tideglass Stalker',strength:1.65},
  ],
};

export const LOCKWORKS: RegionWorld = {
  zone:'lockworks',
  map:roomMap(27,18,[
    [2,8,1,5],[2,8,6,1],[5,6,4,4],[8,6,5,1],[12,4,1,3],[10,1,5,4],
    [13,6,13,1],[16,6,1,5],[15,10,4,4],[18,12,3,1],[20,8,5,5],[22,6,1,3],
    [23,12,1,3],[21,14,5,3],
  ]),
  spawn:{x:2,y:11}, direction:3, outdoor:false, ceiling:3.65,
  buildings:[], residents:[], entrances:[],
  passages:[
    {id:'lock-return',x:2,y:12,to:'estuary',spawn:{x:21,y:6},direction:1,label:'Climb to Saltreach'},
    {id:'lock-culvert',x:25,y:6,to:'warehouse',spawn:{x:16,y:8},direction:3,label:'Unbolt the culvert to the warehouse'},
    {id:'bell-stairs',x:14,y:1,to:'estuary',spawn:{x:21,y:3},direction:2,label:'Unbolt the tower door and return outside'},
  ],
  encounters:[
    {id:'lock-trap',x:4,y:8,kind:'scavenger',name:'Sluice Crawler',strength:1.55},
    {id:'lock-channel',x:10,y:6,kind:'wraith',name:'Drowned Lamplighter',strength:1.7},
    {id:'lock-sump',x:16,y:8,kind:'scavenger',name:'Sump Carapace',strength:1.7,tactic:'shell'},
    {id:'lock-siphon',x:21,y:12,kind:'wraith',name:'Echo of the Lock',strength:1.65,tactic:'riposte'},
    {id:'lock-lantern',x:23,y:14,kind:'scavenger',name:'Light Thief',strength:1.85},
    {id:'bell-keeper',x:12,y:2,kind:'sentinel',name:'The Drowned Keeper',strength:1.48},
  ],
};
