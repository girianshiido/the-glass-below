export type UpdateResult={state:'ready';worker:ServiceWorker}|{state:'current'|'unavailable'|'offline'|'failed'};
/** A check downloads a new worker, but never activates it or interrupts a battle. */
export async function checkForUpdate(registration:ServiceWorkerRegistration|undefined,online=true):Promise<UpdateResult>{
 if(!registration)return{state:'unavailable'};
 if(!online)return{state:'offline'};
 try{
  await registration.update();
  if(registration.waiting)return{state:'ready',worker:registration.waiting};
  const worker=registration.installing;
  if(worker&&worker.state!=='activated'&&worker.state!=='redundant')await new Promise<void>(resolve=>{
   const finish=()=>{clearTimeout(timeout);worker.removeEventListener('statechange',changed);resolve();};
   const changed=()=>{if(['installed','activated','redundant'].includes(worker.state))finish();};
   const timeout=setTimeout(finish,15000);worker.addEventListener('statechange',changed);changed();
  });
  if(registration.waiting)return{state:'ready',worker:registration.waiting};
  if(registration.installing||worker?.state==='redundant')return{state:'failed'};
  return{state:'current'};
 }catch{return{state:'failed'};}
}
