import {createHash} from 'node:crypto';
export function shellWorker(assets,version){return `
const CACHE=${JSON.stringify('cn-shell-'+version)},ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil((async()=>{try{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);}catch(error){await caches.delete(CACHE);throw error;}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('cn-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;const key=req.mode==='navigate'?'/index.html':url.pathname;if(!ASSETS.includes(key))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const saved=await cache.match(key);return saved??fetch(req);})());});
`;}
export function offlineShell(){return {name:'collegenotes-offline-shell',apply:'build',enforce:'post',generateBundle:{order:'post',handler(_options,bundle){const files=Object.keys(bundle).filter(f=>!f.endsWith('.map'));const hash=createHash('sha256');for(const f of files.sort()){const a=bundle[f];hash.update(f);hash.update(a.type==='asset'?a.source:a.code);}this.emitFile({type:'asset',fileName:'sw.js',source:shellWorker(files.map(f=>'/'+f),hash.digest('hex').slice(0,20))});}}};}
