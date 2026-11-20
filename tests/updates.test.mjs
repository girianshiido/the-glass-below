import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkForUpdate} from '../src/updates.ts';
test('Update checks report current, offline and unavailable without reloading',async()=>{
 let calls=0;const r={waiting:null,installing:null,update:async()=>{calls++;}};
 assert.deepEqual(await checkForUpdate(undefined),{state:'unavailable'});
 assert.deepEqual(await checkForUpdate(r,false),{state:'offline'});assert.equal(calls,0);
 assert.deepEqual(await checkForUpdate(r),{state:'current'});assert.equal(calls,1);
});
test('A downloaded update is offered without activating it; network failures allow retry',async()=>{
 let activated=false;const worker={postMessage(){activated=true;}};
 const r={waiting:worker,installing:null,update:async()=>{}};
 assert.deepEqual(await checkForUpdate(r),{state:'ready',worker});assert.equal(activated,false);
 r.update=async()=>{throw Error('network');};assert.deepEqual(await checkForUpdate(r),{state:'failed'});
 r.update=async()=>{};assert.equal((await checkForUpdate(r)).state,'ready');
});
test('Checks wait for installation to finish before reporting an available update',async()=>{
 const worker=new EventTarget();worker.state='installing';
 const r={waiting:null,installing:worker,update:async()=>{setTimeout(()=>{worker.state='installed';r.waiting=worker;r.installing=null;worker.dispatchEvent(new Event('statechange'));},5);}};
 assert.deepEqual(await checkForUpdate(r),{state:'ready',worker});
});
