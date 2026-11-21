import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
const dist=new URL('../dist/',import.meta.url),out=new URL('../release/',import.meta.url);
let html=await readFile(new URL('index.html',dist),'utf8');
const jsPath=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssPath=html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if(!jsPath||!cssPath)throw new Error('Built entry points not found');
let js=await readFile(new URL(jsPath,dist),'utf8');
let css=await readFile(new URL(cssPath,dist),'utf8');
for(const path of ['art/bestiary.png','art/impacts.png',...(await readdir(new URL('audio/',dist))).filter(f=>/\.(ogg|m4a)$/.test(f)).map(f=>'audio/'+f)]){
  const mime=path.endsWith('.png')?'image/png':path.endsWith('.ogg')?'audio/ogg':'audio/mp4';
  const data=`data:${mime};base64,`+(await readFile(new URL(path,dist))).toString('base64');
  js=js.replaceAll('./'+path,data);
}
for(const match of [...css.matchAll(/url\(([^)]+)\)/g)]){
 const ref=match[1].replace(/^['"]|['"]$/g,'');if(ref.startsWith('data:')||ref.startsWith('http'))continue;
 const image=await readFile(new URL(ref,new URL(cssPath,dist)));const mime=ref.endsWith('.webp')?'image/webp':ref.endsWith('.svg')?'image/svg+xml':'image/png';css=css.replace(match[0],`url("data:${mime};base64,${image.toString('base64')}")`);
}
// The standalone copy uses inline assets and no service worker or install manifest.
js=js.replaceAll('"serviceWorker"in navigator','location.protocol!=="file:"&&"serviceWorker"in navigator');
html=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,()=>`<script type="module">${js.replaceAll('</script','<\\/script')}</script>`);
html=html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/,()=>`<style>${css}</style>`);
html=html.replace(/<link[^>]+(?:manifest|apple-touch-icon)[^>]*>/g,'');
html=html.replace(/<link[^>]+rel="icon"[^>]*>/,'');
await mkdir(out,{recursive:true});
await writeFile(new URL('The-Glass-Below.html',out),html);
console.log('Standalone game: release/The-Glass-Below.html');
