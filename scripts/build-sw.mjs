import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../dist/',import.meta.url);
const files=(await readdir(root,{recursive:true,withFileTypes:true})).filter(f=>f.isFile()&&f.name!=='sw.js'&&!f.name.startsWith('.')).map(f=>relative(fileURLToPath(root),join(f.parentPath,f.name)).replaceAll('\\','/')).sort();
const hash=createHash('sha256');for(const file of files)hash.update(file).update(await readFile(new URL(file,root)));
const version=hash.digest('hex').slice(0,16);
await writeFile(new URL('sw.js',root),`/* Hollow Depths — offline release ${version} */
const PREFIX='hollow-depths:'+new URL(self.registration.scope).pathname+':';
const CACHE=PREFIX+'${version}';
const ENTRIES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ENTRIES.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'}))))));
self.addEventListener('message',event=>{if(event.data?.type==='APPLY_UPDATE')event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request.mode==='navigate'?new URL('index.html',self.registration.scope).href:event.request,{ignoreVary:true})).then(cached=>cached??fetch(event.request)));});
`);
console.log(`Offline: ${files.length} files, version ${version}`);
