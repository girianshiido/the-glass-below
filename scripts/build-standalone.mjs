import {readFile,writeFile,mkdir} from 'node:fs/promises';
const dist=new URL('../dist/',import.meta.url),out=new URL('../release/',import.meta.url);
let html=await readFile(new URL('index.html',dist),'utf8');
const jsPath=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssPath=html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if(!jsPath||!cssPath)throw new Error('Built entry points not found');
let js=await readFile(new URL(jsPath,dist),'utf8');
const css=await readFile(new URL(cssPath,dist),'utf8');
const atlas='data:image/png;base64,'+(await readFile(new URL('art/bestiary.png',dist))).toString('base64');
js=js.replaceAll('./art/bestiary.png',atlas);
// The standalone copy uses inline assets and no service worker or install manifest.
js=js.replaceAll('"serviceWorker"in navigator','location.protocol!=="file:"&&"serviceWorker"in navigator');
html=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,()=>`<script type="module">${js.replaceAll('</script','<\\/script')}</script>`);
html=html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/,()=>`<style>${css}</style>`);
html=html.replace(/<link[^>]+(?:manifest|apple-touch-icon)[^>]*>/g,'');
html=html.replace(/<link[^>]+rel="icon"[^>]*>/,'');
await mkdir(out,{recursive:true});
await writeFile(new URL('Hollow-Depths.html',out),html);
console.log('Standalone game: release/Hollow-Depths.html');
