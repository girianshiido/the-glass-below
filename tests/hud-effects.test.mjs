import {test} from 'node:test';
import assert from 'node:assert/strict';
import {caption,captionOpacity,objective} from '../src/hud.ts';
import {effectFor,impactAnchor} from '../src/effects.ts';
import {createGame,beginBattle} from '../src/engine.ts';
test('The entry caption holds for three seconds, fades, and stays gone',()=>{
 const c=caption('The Glass Crypts',100,3,2);assert.equal(captionOpacity(c,102.9),1);assert.equal(captionOpacity(c,104),.5);assert.equal(captionOpacity(c,105),0);assert.equal(captionOpacity(c,200),0);assert.equal(captionOpacity(null,200),0);
});
test('Objective details remain available in menus as progression changes',()=>{
 const g=createGame();assert.equal(objective(g),'Find the copper key');g.key=true;assert.equal(objective(g),'Open the eastern gate');g.gateOpen=true;assert.equal(objective(g),'Defeat the Faceless Warden');g.cleared.add('guardian');assert.equal(objective(g),'Reach the exit');
});
test('Four ordinary impacts vary, while each spell keeps its own visual and sound',()=>{
 const cells=new Set([0,1,2,3].map(id=>effectFor({id,kind:'hit',text:'−12',time:0}).cell));assert.equal(cells.size,4);
 for(const[kind,cell,sound]of [['ice',4,'frost'],['heal',5,'heal'],['break',6,'fracture'],['hurt',7,'hit']])assert.deepEqual([effectFor({id:1,kind,text:'',time:0}).cell,effectFor({id:1,kind,text:'',time:0}).sound],[cell,sound]);
});
test('Impacts follow actual enemy positions across narrow and wide views',()=>{
 const g=createGame();g.position={x:6,y:7};beginBattle(g,{id:'pair',x:7,y:7,kind:'scavenger',count:2});const camera={x:6,y:7,yaw:0};
 for(const[w,h]of [[375,440],[457,375],[1280,650],[1920,900]]){const a=impactAnchor(g,camera,w,h,{id:1,kind:'hit',enemy:0,time:0,text:''}),b=impactAnchor(g,camera,w,h,{id:2,kind:'hit',enemy:1,time:0,text:''});assert(a.x<50);assert(b.x>50);assert(Math.abs(a.x+b.x-100)<1e-8);assert(a.y>50&&a.y<85);}
});
